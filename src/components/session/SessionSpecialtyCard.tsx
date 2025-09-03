"use client";
import { Specialty } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getMedicalIcon, getIconBySpecialtyName } from '@/lib/medical-icons';
import { useMemo } from 'react';

interface SessionSpecialtyCardProps {
  specialty: Specialty & { _count?: { sessions?: number } };
  maxSessions: number; // for relative bar visualization
}

export function SessionSpecialtyCard({ specialty, maxSessions }: SessionSpecialtyCardProps) {
  const router = useRouter();

  // Reuse gradient hashing logic similar to ExerciseCard
  const iconGradient = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < specialty.name.length; i++) {
      hash = specialty.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const gradients = [
      'from-blue-400 to-blue-500',
      'from-emerald-400 to-emerald-500',
      'from-medblue-400 to-medblue-500',
      'from-orange-400 to-orange-500',
      'from-rose-400 to-rose-500',
      'from-cyan-400 to-cyan-500',
      'from-lime-400 to-lime-500',
      'from-fuchsia-400 to-fuchsia-500',
      'from-indigo-400 to-indigo-500',
      'from-teal-400 to-teal-500',
    ];
    return gradients[Math.abs(hash) % gradients.length];
  }, [specialty.name]);

  const medicalIcon = specialty.icon ? getMedicalIcon(specialty.icon) : getIconBySpecialtyName(specialty.name);
  const IconComponent = medicalIcon.icon;

  const sessionCount = specialty._count?.sessions || 0;
  const relative = maxSessions > 0 ? (sessionCount / maxSessions) * 100 : 0;

  const handleClick = () => {
    if (sessionCount > 0) {
      router.push(`/session/${specialty.id}?name=${encodeURIComponent(specialty.name)}`);
    }
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1 ${sessionCount === 0 ? 'opacity-90' : ''}`}
      onClick={handleClick}
    >
      <CardContent className="p-8">
        {/* Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative">
            <div className={`flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${iconGradient} border-2 border-white/20 shadow-lg mb-4`}>
              <IconComponent className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-bold text-left line-clamp-2 mb-3 text-gray-900 dark:text-gray-100">
            {specialty.name}
          </h3>
          {/* Replacing question progress with sessions bar */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Sessions
            </span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {sessionCount}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${relative}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {sessionCount > 0 ? (
              <span>{sessionCount} session{sessionCount > 1 ? 's' : ''} disponibles</span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">Aucune session</span>
            )}
            {specialty.semester?.order && (
              <span className="text-gray-500 dark:text-gray-400">Semestre {specialty.semester.order}</span>
            )}
          </div>
        </div>

        <Button
          className={`w-full ${sessionCount > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'}`}
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          disabled={sessionCount === 0}
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          {sessionCount > 0 ? 'Voir les sessions' : 'Indisponible'}
        </Button>
      </CardContent>
    </Card>
  );
}
