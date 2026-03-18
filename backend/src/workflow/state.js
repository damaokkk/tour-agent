/**
 * 工作流状态定义
 */

export function createInitialState(userQuery) {
  return {
    userQuery,
    intent: null,
    searchQueries: [],
    searchResults: [],
    itinerary: null,
    validationErrors: [],
    planAttempts: 0,
    finalResult: null,
    errorMessage: null
  };
}

export const NodeStatus = {
  EXTRACTING: 'extracting',
  SEARCHING: 'searching',
  PLANNING: 'planning',
  VALIDATING: 'validating',
  SUCCESS: 'success',
  ERROR: 'error'
};
