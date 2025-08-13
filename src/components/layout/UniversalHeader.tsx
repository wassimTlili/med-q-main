'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Search, 
  User, 
  Settings, 
  LogOut,
  UserCircle,
  Menu,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';
import { useSidebar } from '@/components/ui/sidebar';

interface UniversalHeaderProps {
  title?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
}

export function UniversalHeader({
  title,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  actions
}: UniversalHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [notificationCount] = useState(3); // Mock notification count
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/auth');
    } catch (err) {
      console.error('Unexpected sign out error:', err);
      toast({
        title: t('auth.signOutError'),
        description: t('auth.unexpectedError'),
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-40 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Title and Search */}
          <div className="flex items-center space-x-4 flex-1">
            {/* Title Section */}
            {title && (
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  {title}
                </h1>
              </div>
            )}

            {/* Search Bar */}
            {showSearch && (
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Right Section: Notifications, Profile */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">New question added</p>
                    <p className="text-xs text-gray-500">Cardiology - 2 minutes ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Progress updated</p>
                    <p className="text-xs text-gray-500">General Surgery - 1 hour ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">New lecture available</p>
                    <p className="text-xs text-gray-500">Endocrinology - 3 hours ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center">
                  <span className="text-blue-600 hover:text-blue-700">View all notifications</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.image} alt={user?.name || user?.email || 'User'} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {user?.name ? getInitials(user.name) : <UserCircle className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Actions Row - Below Header */}
      {actions && (
        <div className="bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-end">
              {actions}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
