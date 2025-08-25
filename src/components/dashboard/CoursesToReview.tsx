"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useDashboardData } from "@/hooks/useDashboardData";
import Link from "next/link";

export const CoursesToReview: React.FC = () => {
  const { coursesToReview, isLoading } = useDashboardData();

  return (
    <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">Cours à revoir</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isLoading && <div className="animate-pulse text-sm">Chargement...</div>}
        {!isLoading && coursesToReview.length === 0 && <div className="text-sm text-muted-foreground">Aucun cours sous 10/20.</div>}
        <ul className="space-y-2 overflow-y-auto pr-1">
          {coursesToReview.map(c => (
            <li key={c.id} className="flex items-center justify-between text-sm bg-secondary/40 dark:bg-secondary/30 rounded px-2 py-1">
              <Link href={`/lecture/${c.id}`} className="truncate hover:underline flex-1 mr-2">{c.title}</Link>
              <span className="text-xs font-medium">{(c.averageScore/5).toFixed(1)}/20</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
export default CoursesToReview;
