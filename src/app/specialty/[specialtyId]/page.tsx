'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSpecialty } from '@/hooks/use-specialty'
import { AppLayout } from '@/components/layout/AppLayout'
import { SpecialtyActions } from '@/components/specialties/SpecialtyActions'
import { EditSpecialtyDialog } from '@/components/specialties/EditSpecialtyDialog'
import { SpecialtyHeader } from '@/components/specialties/SpecialtyHeader'
import { LecturesList } from '@/components/specialties/LecturesList'
import { AddLectureDialog } from '@/components/specialties/AddLectureDialog'
import { AddQuestionDialog } from '@/components/specialties/AddQuestionDialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { toast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'

export default function SpecialtyPageRoute() {
  const params = useParams()
  const router = useRouter()
  const { t } = useTranslation()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  if (!params?.specialtyId) {
    return <div>Specialty ID not found</div>
  }
  
  const specialtyId = params.specialtyId as string
  
  const {
    specialty,
    lectures,
    isLoading,
    selectedLectureId,
    setSelectedLectureId,
    isAddQuestionOpen,
    setIsAddQuestionOpen,
    isAddLectureOpen,
    setIsAddLectureOpen,
    fetchSpecialtyAndLectures,
    handleOpenAddQuestion,
  } = useSpecialty(specialtyId);

  const handleEdit = () => {
    setIsEditDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!specialty) return
    
    if (!confirm(t('specialties.confirmDelete') || 'Are you sure you want to delete this specialty?')) {
      return
    }

    try {
      const response = await fetch(`/api/specialties/${specialty.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete specialty')
      }

      toast({
        title: t('common.success') || 'Success',
        description: t('specialties.deletedSuccessfully') || 'Specialty deleted successfully',
      })

      router.push('/exercices')
    } catch (error) {
      console.error('Error deleting specialty:', error)
      toast({
        title: t('common.error') || 'Error',
        description: error instanceof Error ? error.message : (t('common.tryAgain') || 'Please try again'),
        variant: "destructive",
      })
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50 dark:from-purple-950/20 dark:via-gray-900 dark:to-blue-950/20">
          <div className="container mx-auto px-4 py-8 space-y-8">
            {specialty && (
              <SpecialtyActions 
                specialty={specialty}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onLectureAdded={fetchSpecialtyAndLectures}
                onQuestionAdded={fetchSpecialtyAndLectures}
              />
            )}

            <SpecialtyHeader 
              specialty={specialty} 
              isLoading={isLoading} 
            />

            <LecturesList 
              lectures={lectures} 
              isLoading={isLoading} 
            />

            <EditSpecialtyDialog
              specialty={specialty}
              isOpen={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onSpecialtyUpdated={fetchSpecialtyAndLectures}
            />

            <AddLectureDialog 
              isOpen={isAddLectureOpen}
              onOpenChange={setIsAddLectureOpen}
              specialtyId={specialtyId || ''}
              onLectureAdded={fetchSpecialtyAndLectures}
            />

            <AddQuestionDialog 
              isOpen={isAddQuestionOpen}
              onOpenChange={setIsAddQuestionOpen}
              selectedLectureId={selectedLectureId}
              setSelectedLectureId={setSelectedLectureId}
              lectures={lectures}
            />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
} 