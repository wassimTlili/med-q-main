'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSpecialty } from '@/hooks/use-specialty'
import { useAuth } from '@/contexts/AuthContext'
import { UniversalHeader } from '@/components/layout/UniversalHeader'
import { AppSidebar, AppSidebarProvider } from '@/components/layout/AppSidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { EditSpecialtyDialog } from '@/components/specialties/EditSpecialtyDialog'
import { AddLectureDialog } from '@/components/specialties/AddLectureDialog'
import { AddQuestionDialog } from '@/components/specialties/AddQuestionDialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search, 
  Filter, 
  MessageCircle, 
  BookOpen, 
  CheckCircle, 
  TrendingUp,
  BarChart3,
  Play,
  Dumbbell,
  Folder,
  File,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  Edit,
  Trash,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'
// import { LectureComments } from '@/components/lectures/LectureComments'
import { getMedicalIcon, getIconBySpecialtyName } from '@/lib/medical-icons'

export default function SpecialtyPageRoute() {
  const params = useParams()
  const router = useRouter()
  const { t } = useTranslation()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedLecture, setSelectedLecture] = useState<any>(null)
  // const [commentsDialogOpen, setCommentsDialogOpen] = useState(false)
  const [questionTypeDialogOpen, setQuestionTypeDialogOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  
  // Group management state - using database persistence
  const [courseGroups, setCourseGroups] = useState<Record<string, string[]>>({
    'General Courses': []
  })
  const [isGroupManagementOpen, setIsGroupManagementOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  
  const { isAdmin, user } = useAuth()
  
  const specialtyId = params?.specialtyId as string
  
  const {
    specialty,
    lectures,
    isLoading,
    selectedLectureId,
    setSelectedLectureId,
  } = useSpecialty(specialtyId)

  if (!specialtyId) {
    return <div>Specialty ID not found</div>
  }

  // Load course groups from database
  useEffect(() => {
    const loadCourseGroups = async () => {
      if (!user?.id || !specialtyId) return
      
      try {
        const response = await fetch(`/api/course-groups?userId=${user.id}&specialtyId=${specialtyId}`)
        if (response.ok) {
          const groups = await response.json()
          const groupsMap: Record<string, string[]> = { 'General Courses': [] }
          
          groups.forEach((group: any) => {
            if (group.lectureGroups) {
              groupsMap[group.name] = group.lectureGroups.map((lg: any) => lg.lectureId)
            }
          })
          
          setCourseGroups(groupsMap)
        }
      } catch (error) {
        console.error('Error loading course groups:', error)
      }
    }

    loadCourseGroups()
  }, [user?.id, specialtyId])

  // Group management functions - using database persistence
  const createGroup = async () => {
    if (!newGroupName.trim() || !user?.id || !specialtyId) return
    
    try {
      const response = await fetch('/api/course-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          userId: user.id,
          specialtyId: specialtyId,
        }),
      })

      if (response.ok) {
        setCourseGroups(prev => ({
          ...prev,
          [newGroupName.trim()]: []
        }))
        
        setExpandedGroups(prev => ({
          ...prev,
          [newGroupName.trim()]: true
        }))
        
        setNewGroupName('')
        toast({
          title: "Group created",
          description: `Group "${newGroupName.trim()}" created successfully`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to create group",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating group:', error)
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      })
    }
  }

  const deleteGroup = async (groupName: string) => {
    if (groupName === 'General Courses' || !user?.id) return
    
    try {
      // First, get the group ID
      const groupsResponse = await fetch(`/api/course-groups?userId=${user.id}&specialtyId=${specialtyId}`)
      if (!groupsResponse.ok) return
      
      const groups = await groupsResponse.json()
      const groupToDelete = groups.find((g: any) => g.name === groupName)
      if (!groupToDelete) return

      const response = await fetch(`/api/course-groups/${groupToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCourseGroups(prev => {
          const updated = { ...prev }
          // Move courses back to General Courses
          if (updated[groupName]?.length > 0) {
            updated['General Courses'] = [...(updated['General Courses'] || []), ...updated[groupName]]
          }
          delete updated[groupName]
          return updated
        })
        
        setExpandedGroups(prev => {
          const updated = { ...prev }
          delete updated[groupName]
          return updated
        })
        
        toast({
          title: "Group deleted",
          description: `Group "${groupName}" deleted successfully`,
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete group",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      })
    }
  }

  // Function to get current group of a course
  const getCourseGroup = (courseId: string) => {
    for (const [groupName, courseIds] of Object.entries(courseGroups)) {
      if (courseIds.includes(courseId)) {
        return groupName
      }
    }
    return 'General Courses'
  }

  // Function to move course to different group
  const moveCourseToGroup = async (courseId: string, newGroupName: string) => {
    if (!user?.id) return

    try {
      // First, remove course from any existing group
      await fetch('/api/lecture-groups', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lectureId: courseId,
          userId: user.id,
        }),
      })

      // If not moving to General Courses, add to the new group
      if (newGroupName !== 'General Courses') {
        // Get the group ID first
        const groupsResponse = await fetch(`/api/course-groups?userId=${user.id}&specialtyId=${specialtyId}`)
        if (groupsResponse.ok) {
          const groups = await groupsResponse.json()
          const targetGroup = groups.find((g: any) => g.name === newGroupName)
          
          if (targetGroup) {
            await fetch('/api/lecture-groups', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                lectureId: courseId,
                courseGroupId: targetGroup.id,
              }),
            })
          }
        }
      }

      // Update local state
      setCourseGroups(prev => {
        const updated = { ...prev }
        
        // Remove course from current group
        Object.keys(updated).forEach(groupName => {
          updated[groupName] = updated[groupName].filter(id => id !== courseId)
        })
        
        // Add course to new group
        if (!updated[newGroupName]) {
          updated[newGroupName] = []
        }
        updated[newGroupName].push(courseId)
        
        return updated
      })
      
      toast({
        title: "Course moved",
        description: `Course moved to ${newGroupName}`,
      })
    } catch (error) {
      console.error('Error moving course:', error)
      toast({
        title: "Error", 
        description: "Failed to move course",
        variant: "destructive",
      })
    }
  }

  // Expand all groups by default when lectures load
  useEffect(() => {
    if (lectures.length > 0) {
      // Create groups and expand them all
      const groups = lectures.reduce((acc, lecture) => {
        // Same grouping logic as above
        let groupName = 'General Courses'
        
        if (lecture.title.toLowerCase().includes('anatomy')) {
          groupName = 'Anatomy & Physiology'
        } else if (lecture.title.toLowerCase().includes('pathology')) {
          groupName = 'Pathology'
        } else if (lecture.title.toLowerCase().includes('clinical')) {
          groupName = 'Clinical Practice'
        } else if (lecture.title.toLowerCase().includes('surgery')) {
          groupName = 'Surgery'
        } else if (lecture.title.toLowerCase().includes('medicine')) {
          groupName = 'Internal Medicine'
        }
        
        acc[groupName] = true
        return acc
      }, {} as Record<string, boolean>)
      setExpandedGroups(groups)
    }
  }, [lectures.length])

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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppSidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <UniversalHeader title="Loading..." />
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </SidebarInset>
        </AppSidebarProvider>
      </ProtectedRoute>
    )
  }

  if (!specialty) {
    return (
      <ProtectedRoute>
        <AppSidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <UniversalHeader title="Specialty not found" />
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-8">
              <p>Specialty not found</p>
            </div>
          </SidebarInset>
        </AppSidebarProvider>
      </ProtectedRoute>
    )
  }

  // Filter lectures based on search and filter
  const filteredLectures = lectures.filter(lecture => {
    const matchesSearch = lecture.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'completed' && lecture.progress?.percentage === 100) ||
      (selectedFilter === 'in-progress' && lecture.progress && lecture.progress.percentage > 0 && lecture.progress.percentage < 100) ||
      (selectedFilter === 'not-started' && (!lecture.progress || lecture.progress.percentage === 0))
    return matchesSearch && matchesFilter
  })

  // Group lectures by admin-created categories
  const groupedLectures = Object.keys(courseGroups).reduce((acc, groupName) => {
    const groupLectureIds = courseGroups[groupName]
    const groupLectures = filteredLectures.filter(lecture => 
      groupLectureIds.includes(lecture.id)
    )
    
    if (groupLectures.length > 0) {
      acc[groupName] = groupLectures
    }
    
    return acc
  }, {} as Record<string, typeof lectures>)

  // Add ungrouped lectures to "General Courses" group (default)
  const assignedLectureIds = Object.values(courseGroups).flat()
  const ungroupedLectures = filteredLectures.filter(lecture => 
    !assignedLectureIds.includes(lecture.id)
  )
  
  if (ungroupedLectures.length > 0) {
    if (!groupedLectures['General Courses']) {
      groupedLectures['General Courses'] = []
    }
    groupedLectures['General Courses'] = [...(groupedLectures['General Courses'] || []), ...ungroupedLectures]
  }

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  // const handleCommentsOpen = (lecture: any) => {
  //   setSelectedLecture(lecture)
  //   setCommentsDialogOpen(true)
  // }

  const handleQuestionTypeOpen = (lecture: any) => {
    setSelectedLecture(lecture)
    setQuestionTypeDialogOpen(true)
  }

  const handleSpecialtyUpdated = () => {
    // Refresh the specialty data
    window.location.reload()
  }

  return (
    <ProtectedRoute>
      <AppSidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <UniversalHeader title={specialty.name} />
          
          <div className="flex-1 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
              
              {/* Info Card */}
              <Card className="bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 shadow-lg">
                      {(() => {
                        const iconData = specialty.icon ? getMedicalIcon(specialty.icon) : getIconBySpecialtyName(specialty.name);
                        const IconComponent = iconData.icon;
                        return <IconComponent className="w-8 h-8 text-white" />;
                      })()}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {specialty.name}
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {specialty.description || 'Explorez les chapitres et suivez votre progression'}
                      </p>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                            <BarChart3 className="w-4 h-4" />
                            <span className="text-sm font-medium">Progression</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {Math.round(specialty.progress?.questionProgress || 0)}%
                          </div>
                          {/* Mini progress bar showing real data */}
                          <div className="relative h-1 w-full overflow-hidden rounded-full bg-gray-200 mt-2">
                            {(() => {
                              const total = specialty.progress?.totalQuestions || 1;
                              const correct = specialty.progress?.correctQuestions || 0;
                              const incorrect = specialty.progress?.incorrectQuestions || 0;
                              const partial = specialty.progress?.partialQuestions || 0;
                              
                              const correctPercent = (correct / total) * 100;
                              const incorrectPercent = (incorrect / total) * 100;
                              const partialPercent = (partial / total) * 100;
                              
                              return (
                                <>
                                  <div className="absolute h-full bg-green-500" style={{ width: `${correctPercent}%` }} />
                                  <div className="absolute h-full bg-orange-500" style={{ left: `${correctPercent}%`, width: `${partialPercent}%` }} />
                                  <div className="absolute h-full bg-red-500" style={{ left: `${correctPercent + partialPercent}%`, width: `${incorrectPercent}%` }} />
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Correctes</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {specialty.progress?.correctQuestions || 0}
                          </div>
                        </div>
                        
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm font-medium">Partielles</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {specialty.progress?.partialQuestions || 0}
                          </div>
                        </div>
                        
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                            <BookOpen className="w-4 h-4" />
                            <span className="text-sm font-medium">Incorrectes</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {specialty.progress?.incorrectQuestions || 0}
                          </div>
                        </div>
                      </div>
                      
                          {/* Progress Bar with 3 colors */}
                          <div className="mt-4">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <span>Progression globale</span>
                              <span>{Math.round(specialty.progress?.questionProgress || 0)}%</span>
                            </div>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                              {/* Calculate percentages for each color based on actual data */}
                              {(() => {
                                const total = specialty.progress?.totalQuestions || 1;
                                const correct = specialty.progress?.correctQuestions || 0;
                                const incorrect = specialty.progress?.incorrectQuestions || 0;
                                const partial = specialty.progress?.partialQuestions || 0;
                                
                                const correctPercent = (correct / total) * 100;
                                const incorrectPercent = (incorrect / total) * 100;
                                const partialPercent = (partial / total) * 100;
                                
                                return (
                                  <>
                                    {/* Green for correct answers */}
                                    <div 
                                      className="absolute h-full bg-green-500 transition-all duration-300 ease-in-out rounded-full"
                                      style={{ width: `${correctPercent}%` }}
                                    />
                                    {/* Orange for partial answers */}
                                    <div 
                                      className="absolute h-full bg-orange-500 transition-all duration-300 ease-in-out"
                                      style={{ 
                                        left: `${correctPercent}%`,
                                        width: `${partialPercent}%` 
                                      }}
                                    />
                                    {/* Red for incorrect answers */}
                                    <div 
                                      className="absolute h-full bg-red-500 transition-all duration-300 ease-in-out rounded-r-full"
                                      style={{ 
                                        left: `${correctPercent + partialPercent}%`,
                                        width: `${incorrectPercent}%` 
                                      }}
                                    />
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Group Management Controls */}
              {isAdmin && (
                <Card className="bg-white dark:bg-gray-800 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Course Group Management
                      </h3>
                      <Button
                        onClick={() => setIsGroupManagementOpen(!isGroupManagementOpen)}
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {isGroupManagementOpen ? 'Hide' : 'Manage Groups'}
                      </Button>
                    </div>
                    
                    {isGroupManagementOpen && (
                      <div className="space-y-4">
                        {/* Create New Group */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="New group name..."
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="flex-1"
                          />
                          <Button onClick={createGroup} disabled={!newGroupName.trim()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Group
                          </Button>
                        </div>
                        
                        {/* Existing Groups */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.keys(courseGroups).filter(name => name !== 'General Courses').map((groupName) => (
                            <div
                              key={groupName}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4 text-blue-600" />
                                <span className="font-medium">{groupName}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {courseGroups[groupName].length}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteGroup(groupName)}
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                              >
                                <Trash className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Search and Filter Bar */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800"
                  />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedFilter('all')}>
                      All Courses
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedFilter('completed')}>
                      Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedFilter('in-progress')}>
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedFilter('not-started')}>
                      Not Started
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Lectures Table with Groups */}
              <Card className="bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        {isAdmin && <TableHead>Reports</TableHead>}
                        {/* Comments column removed */}
                        <TableHead>Notes</TableHead>
                        <TableHead>Progress</TableHead>
                        {isAdmin && <TableHead>Group</TableHead>}
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedLectures).map(([groupName, groupLectures]) => [
                        // Group Header Row
                        <TableRow key={`group-${groupName}`} className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                          <TableCell colSpan={isAdmin ? 7 : 6}>
                            <Button
                              variant="ghost"
                              onClick={() => toggleGroup(groupName)}
                              className="flex items-center gap-2 p-0 h-auto font-medium text-gray-900 dark:text-gray-100"
                            >
                              <Folder className="w-4 h-4 text-blue-600" />
                              {expandedGroups[groupName] ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              {groupName}
                              <Badge variant="secondary" className="ml-2">
                                {groupLectures.length} courses
                              </Badge>
                            </Button>
                          </TableCell>
                        </TableRow>,
                        
                        // Group Content Rows
                        ...(expandedGroups[groupName] ? groupLectures.map((lecture) => (
                          <TableRow key={`lecture-${lecture.id}`} className="border-l-4 border-l-blue-200 dark:border-l-blue-800">
                            <TableCell>
                              <div className="flex items-center gap-2 pl-6">
                                <File className="w-4 h-4 text-gray-500" />
                                <div>
                                  <div className="font-medium">{lecture.title}</div>
                                  <div className="text-sm text-gray-500">{lecture.description}</div>
                                </div>
                              </div>
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/admin/reports?lectureId=${lecture.id}`)}
                                  className="flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                >
                                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                                  <span className="font-medium">{lecture.reportsCount || 0}</span>
                                  <ExternalLink className="w-3 h-3 text-gray-400" />
                                </Button>
                              </TableCell>
                            )}
                            {/* Comments cell removed */}
                            <TableCell>
                              <span className="text-sm text-gray-500">
                                No notes available
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>{Math.round(lecture.progress?.percentage || 0)}%</span>
                                  <span className="text-xs text-gray-500">
                                    {lecture.progress?.completedQuestions || 0}/{lecture.progress?.totalQuestions || 0}
                                  </span>
                                </div>
                                {/* Three-color progress bar with real data */}
                                <div className="relative h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                                  {(() => {
                                    const total = lecture.progress?.totalQuestions || 1;
                                    const correct = lecture.progress?.correctAnswers || 0;
                                    const incorrect = lecture.progress?.incorrectAnswers || 0;
                                    const partial = lecture.progress?.partialAnswers || 0;
                                    
                                    const correctPercent = (correct / total) * 100;
                                    const incorrectPercent = (incorrect / total) * 100;
                                    const partialPercent = (partial / total) * 100;
                                    
                                    return (
                                      <>
                                        {/* Green segment for correct answers */}
                                        <div 
                                          className="absolute h-full bg-green-500 transition-all duration-300 ease-in-out rounded-l-full"
                                          style={{ width: `${correctPercent}%` }}
                                        />
                                        {/* Orange segment for partial answers */}
                                        <div 
                                          className="absolute h-full bg-orange-500 transition-all duration-300 ease-in-out"
                                          style={{ 
                                            left: `${correctPercent}%`,
                                            width: `${partialPercent}%` 
                                          }}
                                        />
                                        {/* Red segment for incorrect answers */}
                                        <div 
                                          className="absolute h-full bg-red-500 transition-all duration-300 ease-in-out rounded-r-full"
                                          style={{ 
                                            left: `${correctPercent + partialPercent}%`,
                                            width: `${incorrectPercent}%` 
                                          }}
                                        />
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <Select
                                  value={getCourseGroup(lecture.id)}
                                  onValueChange={(newGroup) => moveCourseToGroup(lecture.id, newGroup)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="General Courses">
                                      General Courses
                                    </SelectItem>
                                    {Object.keys(courseGroups).filter(name => name !== 'General Courses').map((groupName) => (
                                      <SelectItem key={groupName} value={groupName}>
                                        {groupName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            )}
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => handleQuestionTypeOpen(lecture)}
                                className="bg-sky-500 hover:bg-sky-600 text-white"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Start
                              </Button>
                            </TableCell>
                          </TableRow>
                        )) : [])
                      ].flat())}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Comments Dialog removed */}

          {/* Question Type Dialog */}
          <Dialog open={questionTypeDialogOpen} onOpenChange={setQuestionTypeDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Choose Study Mode
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-3">
                {/* Option 1: Study Lecture */}
                <div 
                  className="group rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all duration-200"
                  onClick={() => {
                    if (selectedLecture) {
                      router.push(`/lecture/${selectedLecture.id}`)
                      setQuestionTypeDialogOpen(false)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-2">
                      <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        📚 Study Lecture
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Full interactive learning experience
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 2: Revision Mode */}
                <div 
                  className="group rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 p-4 cursor-pointer hover:bg-green-50 dark:hover:bg-green-950/50 transition-all duration-200"
                  onClick={() => {
                    if (selectedLecture) {
                      router.push(`/lecture/${selectedLecture.id}/revision`)
                      setQuestionTypeDialogOpen(false)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/50 rounded-lg p-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        ✅ Revision Mode
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Quick review with answers shown
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 3: Pinned Questions Test */}
                <div 
                  className="group rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 p-4 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-all duration-200"
                  onClick={() => {
                    if (selectedLecture) {
                      router.push(`/lecture/${selectedLecture.id}?mode=pinned`)
                      setQuestionTypeDialogOpen(false)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 dark:bg-orange-900/50 rounded-lg p-2">
                      <Dumbbell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        📌 Pinned Questions
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Practice your bookmarked questions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Existing Dialogs */}
          <EditSpecialtyDialog
            specialty={specialty}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSpecialtyUpdated={handleSpecialtyUpdated}
          />
        </SidebarInset>
      </AppSidebarProvider>
    </ProtectedRoute>
  )
}