"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  retryCount: number;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    retryCount: 0
  };

  private static MAX_RETRIES = 3;

  public static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SectionErrorBoundary - ${this.props.sectionName || 'Unknown'}]`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < SectionErrorBoundary.MAX_RETRIES;
      return (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-red-300 bg-red-50 rounded-xl relative overflow-hidden h-full w-full min-h-[150px]">
          <div className="absolute top-2 left-3 hidden md:flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-red-300"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-red-200"></div>
          </div>
          <span className="text-3xl mb-2" aria-hidden="true">🚫</span>
          <h3 className="font-bold text-red-900 mb-1">
            {this.props.sectionName ? `${this.props.sectionName} Error` : "Section Error"}
          </h3>
          <p className="text-xs text-red-700 text-center mb-4 max-w-sm">
            This module crashed independently. The rest of your app is fine.
          </p>
          {!canRetry && (
            <p className="text-xs text-red-600 mb-2 font-bold">Max retries reached. Please reload the page.</p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-400 text-red-800 hover:bg-red-100 font-bold"
            onClick={() => this.setState(prev => ({ 
              hasError: false, 
              retryCount: prev.retryCount + 1 
            }))}
            disabled={!canRetry}
          >
            {canRetry ? "Retry Section" : "Retry Disabled"}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
