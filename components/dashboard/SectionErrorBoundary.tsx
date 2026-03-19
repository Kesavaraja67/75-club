"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SectionErrorBoundary - ${this.props.sectionName || 'Unknown'}]`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
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
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-400 text-red-800 hover:bg-red-100 font-bold"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry Section
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
