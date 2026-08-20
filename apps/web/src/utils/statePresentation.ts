import { ResearchState } from '../types/research';
import { 
  Loader2, 
  Search, 
  CheckCircle2, 
  LineChart, 
  Compass, 
  Scale, 
  ShieldAlert, 
  Key, 
  CreditCard, 
  Unlock, 
  FileEdit, 
  Flag, 
  XOctagon, 
  Ban, 
  RefreshCw 
} from 'lucide-react';
import React from 'react';

export interface StatePresentation {
  label: string;
  tone: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  description: string;
  detail: string;
  icon: React.ElementType;
}

export const STATE_PRESENTATION: Record<ResearchState, StatePresentation> = {
  [ResearchState.CREATED]: {
    label: 'Starting up',
    tone: 'neutral',
    description: 'Preparing your research session.',
    detail: 'The agent is initializing and will begin searching shortly.',
    icon: Loader2
  },
  [ResearchState.RESEARCHING_FREE]: {
    label: 'Researching public sources',
    tone: 'info',
    description: "I'm looking through free sources to find useful information.",
    detail: 'The agent is running web searches and reading publicly available documents. This may take a moment.',
    icon: Search
  },
  [ResearchState.FREE_RESEARCH_COMPLETE]: {
    label: 'Public research complete',
    tone: 'success',
    description: 'Free sources have been searched successfully.',
    detail: "The agent has gathered all available public information and is now analysing what it found.",
    icon: CheckCircle2
  },
  [ResearchState.EVALUATING_GAPS]: {
    label: 'Checking what information is still missing',
    tone: 'info',
    description: "I'm comparing what I found with your research goal.",
    detail: "The agent is reviewing the collected information and deciding whether more in-depth data is needed to fully answer your question.",
    icon: LineChart
  },
  [ResearchState.PAID_DISCOVERY]: {
    label: 'Looking for additional sources',
    tone: 'info',
    description: 'The free sources may not be enough. Checking for relevant premium sources.',
    detail: 'The agent is searching a network of specialist data providers to find sources that could fill the gaps identified in your research.',
    icon: Compass
  },
  [ResearchState.SERVICE_EVALUATION]: {
    label: 'Comparing available sources',
    tone: 'info',
    description: "I'm checking which source would add the most value for the cost.",
    detail: 'The agent is reviewing what each available premium source contains and whether its information is worth the price.',
    icon: Scale
  },
  [ResearchState.PENDING_APPROVAL]: {
    label: 'Your approval is needed',
    tone: 'warning',
    description: 'The agent found an additional source that could improve your research.',
    detail: 'A premium source was found that would significantly improve the research quality. The agent cannot proceed without your approval.',
    icon: ShieldAlert
  },
  [ResearchState.PAYMENT_AUTHORIZED]: {
    label: 'Purchase approved',
    tone: 'success',
    description: 'Thank you — your approval has been received.',
    detail: 'The agent is now processing your approved purchase.',
    icon: Key
  },
  [ResearchState.PAYING]: {
    label: 'Purchasing the approved source',
    tone: 'info',
    description: 'Your approved payment is being processed.',
    detail: 'The transaction is being submitted. This usually takes just a few seconds.',
    icon: CreditCard
  },
  [ResearchState.RESOURCE_ACQUIRED]: {
    label: 'Premium source unlocked',
    tone: 'success',
    description: 'The additional research source has been successfully added.',
    detail: 'Payment was completed and the premium source is now available to the agent.',
    icon: Unlock
  },
  [ResearchState.SYNTHESIZING]: {
    label: 'Writing your research report',
    tone: 'info',
    description: "I'm combining all the information into your final report.",
    detail: 'The agent is reading through all the collected sources and writing a structured summary for you.',
    icon: FileEdit
  },
  [ResearchState.COMPLETED]: {
    label: 'Research complete',
    tone: 'success',
    description: 'Your report is ready.',
    detail: 'The research has finished. Scroll down to read your report.',
    icon: Flag
  },
  [ResearchState.FAILED]: {
    label: "Research couldn't be completed",
    tone: 'danger',
    description: 'Something went wrong during the research process.',
    detail: 'An error stopped the research. Review the details below and try again, or start a new session.',
    icon: XOctagon
  },
  [ResearchState.USER_REJECTED]: {
    label: 'Purchase declined',
    tone: 'danger',
    description: 'The purchase was declined. The agent will continue with what it already found.',
    detail: 'The agent will now synthesise a report using only the sources collected so far.',
    icon: Ban
  },
  [ResearchState.ALTERNATIVE_DISCOVERY]: {
    label: 'Looking for an alternative',
    tone: 'warning',
    description: 'The agent is searching for a different source to fill the gap.',
    detail: 'Because the previous source was unavailable or declined, the agent is now looking for alternatives.',
    icon: RefreshCw
  }
};
