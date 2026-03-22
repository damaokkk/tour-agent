import { NodeStatus, createInitialState } from './state.js';
import { extractIntent, generateSearchQueries, generateItinerary, validateAndFix } from '../services/openai.js';
import { search } from '../services/tavily.js';
import { calculateTransportCost } from '../services/transportCalculator.js';

/**
 * 工作流引擎 - 手动实现类似 LangGraph 的状态机
 */

export class WorkflowEngine {
  constructor(sendEvent) {
    this.sendEvent = sendEvent;
  }

  async run(userQuery) {
    const state = createInitialState(userQuery);
    
    try {
      // 步骤1: 提取意图
      await this.extractNode(state);
      
      // 步骤2: 搜索
      await this.searchNode(state);
      
      // 步骤3: 规划（带重试）
      let success = false;
      while (state.planAttempts < 3 && !success) {
        await this.planNode(state);
        const errors = await this.validateNode(state);
        
        if (errors.length === 0) {
          success = true;
        } else {
          state.planAttempts++;
          state.validationErrors = errors;
          
          if (state.planAttempts < 3) {
            await this.sendEvent({
              status: NodeStatus.PLANNING,
              message: `行程需要调整（尝试 ${state.planAttempts}/3）：${errors.join('；')}`,
              data: { errors, attempt: state.planAttempts }
            });
          }
        }
      }
      
      // 完成
      await this.sendEvent({
        status: NodeStatus.SUCCESS,
        message: '行程规划完成！',
        data: { result: state.itinerary }
      });
      
      return state.itinerary;
      
    } catch (error) {
      console.error('Workflow error:', error);
      console.error('Stack trace:', error.stack);
      await this.sendEvent({
        status: NodeStatus.ERROR,
        message: `规划失败: ${error.message}`,
        data: { error: error.message, stack: error.stack }
      });
      throw error;
    }
  }

  async extractNode(state) {
    await this.sendEvent({
      status: NodeStatus.EXTRACTING,
      message: '正在解析您的行程需求...'
    });
    
    try {
      state.intent = await extractIntent(state.userQuery);
      
      // 如果有出发地，计算交通费用
      if (state.intent.origin && state.intent.origin !== state.intent.destination) {
        await this.sendEvent({
          status: NodeStatus.EXTRACTING,
          message: `正在计算从${state.intent.origin}到${state.intent.destination}的交通费用...`,
          data: { intent: state.intent }
        });
        
        state.transportInfo = await calculateTransportCost(state.intent.origin, state.intent.destination);
        
        if (state.transportInfo) {
          const priceTag = state.transportInfo.isRealPrice ? '【实时票价】' : '【估算价格】';
          await this.sendEvent({
            status: NodeStatus.EXTRACTING,
            message: `交通信息${priceTag}：距离${state.transportInfo.distance}公里，建议${state.transportInfo.suggestedMode}，往返约${state.transportInfo.roundTripCost}元`,
            data: { transportInfo: state.transportInfo }
          });
        }
      }
      
      await this.sendEvent({
        status: NodeStatus.EXTRACTING,
        message: `已识别需求：${state.intent.destination}，${state.intent.days}天，预算${state.intent.budget}元`,
        data: { intent: state.intent, transportInfo: state.transportInfo }
      });
    } catch (error) {
      // 使用默认值
      state.intent = {
        destination: '未知目的地',
        budget: 3000,
        days: 3,
        mustVisit: [],
        foodPrefs: [],
        notes: ''
      };
      throw error;
    }
  }

  async searchNode(state) {
    await this.sendEvent({
      status: NodeStatus.SEARCHING,
      message: '正在搜索相关攻略...'
    });
    
    // 生成搜索查询
    state.searchQueries = await generateSearchQueries(state.intent);
    
    await this.sendEvent({
      status: NodeStatus.SEARCHING,
      message: `已生成 ${state.searchQueries.length} 个搜索任务`,
      data: { totalQueries: state.searchQueries.length }
    });
    
    // 执行搜索 - 并行执行以提高速度
    await this.sendEvent({
      status: NodeStatus.SEARCHING,
      message: `正在并行执行 ${state.searchQueries.length} 个搜索任务...`,
      data: { totalQueries: state.searchQueries.length }
    });
    
    // 并行执行所有搜索
    const searchPromises = state.searchQueries.map(async (query, index) => {
      const result = await search(query);
      await this.sendEvent({
        status: NodeStatus.SEARCHING,
        message: `搜索进度 (${index + 1}/${state.searchQueries.length}): ${query}`,
        data: { query, current: index + 1, total: state.searchQueries.length }
      });
      return result;
    });
    
    state.searchResults = await Promise.all(searchPromises);
    
    await this.sendEvent({
      status: NodeStatus.SEARCHING,
      message: `搜索完成，找到 ${state.searchResults.length} 条参考信息`,
      data: { queryCount: state.searchResults.length }
    });
  }

  async planNode(state) {
    const originInfo = state.intent.origin ? `从${state.intent.origin}出发，` : '';
    await this.sendEvent({
      status: NodeStatus.PLANNING,
      message: state.planAttempts === 0 
        ? `正在为您规划 ${originInfo}${state.intent.destination} ${state.intent.days} 天行程...`
        : `正在重新规划（第 ${state.planAttempts + 1} 次尝试）...`
    });
    
    state.itinerary = await generateItinerary(state.intent, state.searchResults, state.transportInfo);
    
    // 检查是否包含交通费用提醒
    const hasTransport = state.itinerary.days?.some(day => 
      day.activities?.some(a => a.type === '交通')
    );
    const transportMsg = state.intent.origin && hasTransport ? '（已含往返交通）' : '';
    
    await this.sendEvent({
      status: NodeStatus.PLANNING,
      message: `行程草稿已生成${transportMsg}，预估费用 ${state.itinerary.estimatedCost} 元`,
      data: { 
        estimatedCost: state.itinerary.estimatedCost,
        days: state.itinerary.days?.length,
        hasTransport
      }
    });
  }

  async validateNode(state) {
    await this.sendEvent({
      status: NodeStatus.VALIDATING,
      message: '正在校验行程合理性...'
    });
    
    const errors = await validateAndFix(state.itinerary, state.intent);
    
    if (errors.length === 0) {
      await this.sendEvent({
        status: NodeStatus.VALIDATING,
        message: '行程校验通过！'
      });
    } else {
      await this.sendEvent({
        status: NodeStatus.VALIDATING,
        message: `发现问题: ${errors.join('；')}`,
        data: { errors }
      });
    }
    
    return errors;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
