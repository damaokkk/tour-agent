import { NodeStatus, createInitialState } from './state.js';
import { extractIntent, generateSearchQueries, generateItinerary, validateAndFix } from '../services/openai.js';
import { search } from '../services/tavily.js';
import { calculateTransportCost } from '../services/transportCalculator.js';
import { APIUserAbortError } from 'openai';

/**
 * 工作流引擎 - 手动实现类似 LangGraph 的状态机
 */

export class WorkflowEngine {
  constructor(sendEvent, signal = null) {
    this.sendEvent = sendEvent;
    this.signal = signal;
  }

  checkAborted() {
    if (this.signal?.aborted) {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    }
  }

  async run(userQuery) {
    const state = createInitialState(userQuery);
    
    try {
      this.checkAborted();
      await this.extractNode(state);
      
      this.checkAborted();
      await this.searchNode(state);
      
      let success = false;
      while (state.planAttempts < 3 && !success) {
        this.checkAborted();
        await this.planNode(state);
        this.checkAborted();
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
      const isAbort = error.name === 'AbortError' || error.name === 'APIUserAbortError' || error instanceof APIUserAbortError;
      if (!isAbort) {
        console.error('Workflow error:', error);
        console.error('Stack trace:', error.stack);
      }
      // AbortError / APIUserAbortError 是前端主动终止，不发送错误事件
      if (!isAbort) {
        await this.sendEvent({
          status: NodeStatus.ERROR,
          message: `规划失败: ${error.message}`,
          data: { error: error.message, stack: error.stack }
        });
      }
      throw error;
    }
  }

  async extractNode(state) {
    await this.sendEvent({
      status: NodeStatus.EXTRACTING,
      message: '正在解析您的行程需求...'
    });

    // 解析阶段心跳：每3秒发一条消息，避免前端卡住
    const extractMessages = [
      '正在理解您的旅行偏好...',
      '正在识别目的地和预算...',
      '即将完成需求解析...',
    ];
    let extractIdx = 0;
    let extractDone = false;
    const extractHeartbeat = setInterval(() => {
      if (extractDone || this.signal?.aborted) { clearInterval(extractHeartbeat); return; }
      this.sendEvent({
        status: NodeStatus.EXTRACTING,
        message: extractMessages[extractIdx % extractMessages.length],
        data: { thinking: true }
      });
      extractIdx++;
    }, 3000);

    try {
      state.intent = await extractIntent(state.userQuery, this.signal);
      extractDone = true;
      clearInterval(extractHeartbeat);
      
      // 如果有出发地，计算交通费用
      if (state.intent.origin && state.intent.origin !== state.intent.destination) {
        const travelers = state.intent.travelers || 1;
        await this.sendEvent({
          status: NodeStatus.EXTRACTING,
          message: `正在计算从${state.intent.origin}到${state.intent.destination}的交通费用（${travelers}人）...`,
          data: { intent: state.intent }
        });
        
        state.transportInfo = await calculateTransportCost(state.intent.origin, state.intent.destination, travelers);
        
        if (state.transportInfo) {
          const priceTag = state.transportInfo.isRealPrice ? '【实时票价】' : '【估算价格】';
          const travelersInfo = travelers > 1 ? `（${travelers}人）` : '';
          await this.sendEvent({
            status: NodeStatus.EXTRACTING,
            message: `交通信息${priceTag}：距离${state.transportInfo.distance}公里，建议${state.transportInfo.suggestedMode}，往返约${state.transportInfo.roundTripCost}元${travelersInfo}`,
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
      extractDone = true;
      clearInterval(extractHeartbeat);
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
    
    // 生成搜索查询（返回带类型的查询对象）
    state.searchQueries = await generateSearchQueries(state.intent);
    
    // 并行执行所有搜索
    const startTime = Date.now();
    console.log(`[Search] 开始并行执行 ${state.searchQueries.length} 个搜索任务...`);
    
    const searchPromises = state.searchQueries.map(async (queryObj, index) => {
      const queryStart = Date.now();
      const queryText = queryObj.query || queryObj;
      console.log(`[Search] 任务 ${index + 1}/${state.searchQueries.length} 开始: ${queryText}`);
      const result = await search(queryText, this.signal);
      console.log(`[Search] 任务 ${index + 1} 完成，耗时 ${Date.now() - queryStart}ms`);
      return { ...result, query: queryObj };
    });
    
    state.searchResults = await Promise.all(searchPromises);
    console.log(`[Search] 所有搜索完成，总耗时 ${Date.now() - startTime}ms`);
    
    // 提取搜索维度（用于前端展示）
    const searchDimensions = state.searchQueries.map(q => q.type || '攻略');
    
    await this.sendEvent({
      status: NodeStatus.SEARCHING,
      message: `搜索完成，找到 ${state.searchResults.length} 条参考信息`,
      data: { 
        queryCount: state.searchResults.length,
        dimensions: searchDimensions
      }
    });
  }

  async planNode(state) {
    const originInfo = state.intent.origin ? `从${state.intent.origin}出发，` : '';
    
    // 提取搜索维度用于展示
    const searchDimensions = state.searchQueries?.map(q => q.type || '攻略') || [];
    
    // 发送规划开始事件，包含搜索维度信息
    await this.sendEvent({
      status: NodeStatus.PLANNING,
      message: state.planAttempts === 0 
        ? `正在为您规划 ${originInfo}${state.intent.destination} ${state.intent.days} 天行程...`
        : `正在重新规划（第 ${state.planAttempts + 1} 次尝试）...`,
      data: {
        referenceCount: state.searchResults?.length || 0,
        totalDays: state.intent.days,
        destination: state.intent.destination,
        dimensions: searchDimensions
      }
    });

    // 在等待模型第一个 token 期间，每隔几秒发送假进度心跳，避免前端卡住
    const thinkingMessages = [
      '正在分析景点信息...',
      '正在规划每日路线...',
      '正在计算预算分配...',
      '正在优化行程顺序...',
      '正在整理餐饮推荐...',
      '即将开始输出行程...',
    ];
    let thinkingIdx = 0;
    let firstChunkReceived = false;
    const heartbeatTimer = setInterval(() => {
      if (firstChunkReceived || this.signal?.aborted) {
        clearInterval(heartbeatTimer);
        return;
      }
      this.sendEvent({
        status: NodeStatus.PLANNING,
        message: thinkingMessages[thinkingIdx % thinkingMessages.length],
        data: { thinking: true }
      });
      thinkingIdx++;
    }, 5000);

    // 包装 onChunk，第一个 chunk 到来时停止心跳
    const originalOnChunk = (chunk) => {
      if (!firstChunkReceived) {
        firstChunkReceived = true;
        clearInterval(heartbeatTimer);
      }
    };
    
    // 用于收集逐日生成的行程和流式chunk
    const generatedDays = [];
    let streamContent = '';
    
    // 流式生成行程，每生成一天就推送，同时实时推送chunk
    try {
    state.itinerary = await generateItinerary(
      state.intent, 
      state.searchResults, 
      state.transportInfo,
      // 每天完成的回调
      (dayData, dayIndex) => {
        // 去重：同一天只记录一次（流结束后会用真实数据覆盖占位）
        const existingIdx = generatedDays.findIndex(d => d.day === dayData.day);
        if (existingIdx >= 0) {
          generatedDays[existingIdx] = dayData;
        } else {
          generatedDays.push(dayData);
        }
        this.sendEvent({
          status: 'planning_progress',
          message: `已完成第 ${dayData.day} 天规划：${dayData.theme}`,
          data: {
            day: dayData,
            dayIndex: dayIndex,
            completedDays: generatedDays.length,
            totalDays: state.intent.days,
            progress: Math.round((generatedDays.length / state.intent.days) * 100)
          }
        });
        
        // 如果所有天数都完成了，发送规划完成事件
        if (generatedDays.length === state.intent.days) {
          this.sendEvent({
            status: 'planning_complete',
            message: '行程规划完成，正在校验...',
            data: {
              completedDays: generatedDays.length,
              totalDays: state.intent.days
            }
          });
        }
      },
      // A方案：实时chunk回调，每收到一个token就推送
      (chunk) => {
        originalOnChunk(chunk); // 第一个 chunk 到来时停止心跳
        streamContent += chunk;
        // 每积累一定内容或遇到换行就推送（避免过于频繁）
        if (chunk.includes('\n') || streamContent.length > 50) {
          this.sendEvent({
            status: 'planning_stream',
            message: '正在生成行程...',
            data: {
              chunk: streamContent,
              isStreaming: true
            }
          });
          streamContent = '';
        }
      },
      this.signal
    );
    } finally {
      clearInterval(heartbeatTimer);
    }
    
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
    
    // 本地验证无需等待，直接执行
    const errors = validateAndFix(state.itinerary, state.intent);
    
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
