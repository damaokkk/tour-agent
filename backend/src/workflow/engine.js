import { NodeStatus, createInitialState } from './state.js';
import { extractIntent, generateSearchQueries, generateItinerary, validateAndFix } from '../services/openai.js';
import { search } from '../services/tavily.js';

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
      await this.sendEvent({
        status: NodeStatus.ERROR,
        message: `规划失败: ${error.message}`,
        data: { error: error.message }
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
      
      await this.sendEvent({
        status: NodeStatus.EXTRACTING,
        message: `已识别需求：${state.intent.destination}，${state.intent.days}天，预算${state.intent.budget}元`,
        data: { intent: state.intent }
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
    
    // 执行搜索
    let completedCount = 0;
    for (const query of state.searchQueries) {
      completedCount++;
      await this.sendEvent({
        status: NodeStatus.SEARCHING,
        message: `正在搜索 (${completedCount}/${state.searchQueries.length}): ${query}`,
        data: { query, current: completedCount, total: state.searchQueries.length }
      });
      
      const result = await search(query);
      state.searchResults.push(result);
      
      // 减少延迟时间，让响应更快
      await delay(100);
    }
    
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
    
    state.itinerary = await generateItinerary(state.intent, state.searchResults);
    
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
