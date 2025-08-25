"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

export const SpecialtyAverageSlider: React.FC = () => {
  const { specialtyAverages, isLoading } = useDashboardData();
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const count = specialtyAverages.length;

  const next = useCallback(() => {
    if (!count) return; setIndex(i => (i + 1) % count);
  }, [count]);
  const prev = useCallback(() => {
    if (!count) return; setIndex(i => (i - 1 + count) % count);
  }, [count]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { next(); }
      if (e.key === 'ArrowLeft') { prev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  const current = specialtyAverages[index];

  return (
  <Card className={`border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg transition-all duration-300 relative overflow-hidden flex flex-col w-full ${expanded ? 'h-72' : 'h-60'}`}>
  <CardHeader className="pb-1 pt-3 px-4 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">Moyennes par matière</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prev} disabled={!count} aria-label="Précédent">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next} disabled={!count} aria-label="Suivant">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>setExpanded(e=>!e)} aria-label={expanded ? 'Réduire' : 'Agrandir'}>
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
  <CardContent className={`flex-1 flex flex-col items-center justify-center px-3 pb-3 pt-1`}> 
        {isLoading && <div className="animate-pulse text-sm">Chargement...</div>}
        {!isLoading && !current && <div className="text-sm text-muted-foreground">Aucune donnée</div>}
        {!isLoading && current && (
          <div className="w-full h-full flex flex-col items-center justify-center text-center">
            <div className="text-xs text-muted-foreground mb-1">{index+1}/{count}</div>
            <h4 className="font-semibold text-base mb-3 px-2 truncate max-w-full" title={current.name}>{current.name}</h4>
            {/* Circular progress */}
            <div className={`relative flex items-center justify-center ${expanded ? 'w-44 h-44' : 'w-28 h-28'} mb-3`}>
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" className="text-muted/30 fill-none" />
                <circle cx="50" cy="50" r="42" stroke="url(#grad)" strokeWidth="8" strokeLinecap="round" className="fill-none" strokeDasharray={`${2*Math.PI*42}`} strokeDashoffset={`${2*Math.PI*42 * (1 - current.average/100)}`} />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-sm font-semibold">{current.average.toFixed(1)}%</div>
            </div>
            {expanded && (
              <div className="w-full space-y-2">
                <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-700" style={{width: `${current.average}%`}} />
                </div>
                <p className="text-xs text-muted-foreground px-4 leading-snug">
                  Progression moyenne estimée pour cette matière.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default SpecialtyAverageSlider;
