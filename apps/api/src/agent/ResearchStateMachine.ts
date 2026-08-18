export enum ResearchState {
  CREATED = 'CREATED',
  RESEARCHING_FREE = 'RESEARCHING_FREE',
  FREE_RESEARCH_COMPLETE = 'FREE_RESEARCH_COMPLETE',
  EVALUATING_GAPS = 'EVALUATING_GAPS',
  PAID_DISCOVERY = 'PAID_DISCOVERY',
  SERVICE_EVALUATION = 'SERVICE_EVALUATION',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',
  PAYING = 'PAYING',
  RESOURCE_ACQUIRED = 'RESOURCE_ACQUIRED',
  SYNTHESIZING = 'SYNTHESIZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  USER_REJECTED = 'USER_REJECTED',
  ALTERNATIVE_DISCOVERY = 'ALTERNATIVE_DISCOVERY',
  CANCELLED = 'CANCELLED'
}

export class ResearchStateMachine {
  private static readonly transitions: Record<ResearchState, ResearchState[]> = {
    [ResearchState.CREATED]: [ResearchState.RESEARCHING_FREE, ResearchState.FAILED, ResearchState.CANCELLED],
    [ResearchState.RESEARCHING_FREE]: [ResearchState.FREE_RESEARCH_COMPLETE, ResearchState.FAILED],
    [ResearchState.FREE_RESEARCH_COMPLETE]: [ResearchState.EVALUATING_GAPS, ResearchState.FAILED],
    [ResearchState.EVALUATING_GAPS]: [ResearchState.SYNTHESIZING, ResearchState.PAID_DISCOVERY, ResearchState.FAILED],
    [ResearchState.PAID_DISCOVERY]: [ResearchState.SERVICE_EVALUATION, ResearchState.FAILED],
    [ResearchState.SERVICE_EVALUATION]: [
      ResearchState.PENDING_APPROVAL,
      ResearchState.PAYMENT_AUTHORIZED,
      ResearchState.ALTERNATIVE_DISCOVERY,
      ResearchState.SYNTHESIZING,
      ResearchState.FAILED
    ],
    [ResearchState.PENDING_APPROVAL]: [ResearchState.PAYMENT_AUTHORIZED, ResearchState.USER_REJECTED, ResearchState.FAILED],
    [ResearchState.USER_REJECTED]: [ResearchState.ALTERNATIVE_DISCOVERY, ResearchState.FAILED],
    [ResearchState.ALTERNATIVE_DISCOVERY]: [ResearchState.SERVICE_EVALUATION, ResearchState.FAILED],
    [ResearchState.PAYMENT_AUTHORIZED]: [ResearchState.PAYING, ResearchState.FAILED],
    [ResearchState.PAYING]: [ResearchState.RESOURCE_ACQUIRED, ResearchState.FAILED],
    [ResearchState.RESOURCE_ACQUIRED]: [ResearchState.SYNTHESIZING, ResearchState.FAILED],
    [ResearchState.SYNTHESIZING]: [ResearchState.COMPLETED, ResearchState.FAILED],
    [ResearchState.COMPLETED]: [],
    [ResearchState.FAILED]: [],
    [ResearchState.CANCELLED]: []
  };

  /**
   * Evaluates if a transition from currentState to nextState is valid.
   */
  public static canTransition(currentState: ResearchState, nextState: ResearchState): boolean {
    const allowedTransitions = this.transitions[currentState] || [];
    return allowedTransitions.includes(nextState);
  }

  /**
   * Throws an error if the transition is invalid, otherwise returns void.
   */
  public static validateTransition(currentState: ResearchState, nextState: ResearchState): void {
    if (!this.canTransition(currentState, nextState)) {
      throw new Error(`Invalid state transition: Cannot transition from ${currentState} to ${nextState}`);
    }
  }

  /**
   * Validates and executes a state transition, updating the database.
   */
  public static async transition(
    repository: { updateStatus: (id: string, status: ResearchState, failureReason?: string) => Promise<any> },
    sessionId: string,
    currentState: ResearchState,
    nextState: ResearchState,
    failureReason?: string
  ): Promise<void> {
    this.validateTransition(currentState, nextState);
    await repository.updateStatus(sessionId, nextState, failureReason);
  }

  /**
   * Helper to check if a specific tool is allowed based on the state.
   */
  public static isToolAllowed(currentState: ResearchState, toolName: 'ServiceDiscoveryTool' | 'PaymentTool' | 'WebSearchTool'): boolean {
    if (toolName === 'ServiceDiscoveryTool') {
      return currentState === ResearchState.PAID_DISCOVERY || currentState === ResearchState.ALTERNATIVE_DISCOVERY;
    }
    if (toolName === 'PaymentTool') {
      return currentState === ResearchState.SERVICE_EVALUATION;
    }
    if (toolName === 'WebSearchTool') {
      return currentState === ResearchState.RESEARCHING_FREE;
    }
    return false;
  }
}
