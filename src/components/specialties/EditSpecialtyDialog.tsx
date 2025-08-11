import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconSelector } from '@/components/ui/icon-selector';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Specialty, Niveau } from '@/types';
import { getIconBySpecialtyName } from '@/lib/medical-icons';

interface EditSpecialtyDialogProps {
  specialty: Specialty | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSpecialtyUpdated: () => void;
}

export function EditSpecialtyDialog({ 
  specialty, 
  isOpen, 
  onOpenChange, 
  onSpecialtyUpdated 
}: EditSpecialtyDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [niveauId, setNiveauId] = useState<string>('');
  const [isFree, setIsFree] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (specialty) {
      setName(specialty.name || '');
      setDescription(specialty.description || '');
      setIcon(specialty.icon || '');
      setNiveauId(specialty.niveauId || '');
      setIsFree(specialty.isFree || false);
    }
  }, [specialty]);

  useEffect(() => {
    const fetchNiveaux = async () => {
      try {
        const response = await fetch('/api/niveaux');
        if (response.ok) {
          const data = await response.json();
          setNiveaux(data);
        }
      } catch (error) {
        console.error('Error fetching niveaux:', error);
      }
    };

    if (isOpen) {
      fetchNiveaux();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialty) return;

    setIsLoading(true);
    try {
      // Auto-suggest icon if none selected
      const finalIcon = icon || getIconBySpecialtyName(name).name;
      
      const response = await fetch(`/api/specialties/${specialty.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          icon: finalIcon,
          niveauId: niveauId || null,
          isFree,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update specialty');
      }

      toast({
        title: t('common.success'),
        description: t('specialties.updatedSuccessfully'),
      });

      onSpecialtyUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating specialty:', error);
      toast({
        title: t('common.error'),
        description: t('common.tryAgain'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border-blue-200 dark:border-blue-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            {t('specialties.editSpecialty')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('common.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-blue-200 dark:border-blue-800 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="border-blue-200 dark:border-blue-800 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <IconSelector
            value={icon}
            onChange={setIcon}
            label={t('specialties.icon')}
          />

          <div className="space-y-2">
            <Label htmlFor="niveau">{t('common.niveau')}</Label>
            <Select value={niveauId || "none"} onValueChange={(value) => setNiveauId(value === "none" ? "" : value)}>
              <SelectTrigger className="border-blue-200 dark:border-blue-800 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder={t('common.selectNiveau')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('common.noNiveau')}</SelectItem>
                {niveaux.map((niveau) => (
                  <SelectItem key={niveau.id} value={niveau.id}>
                    {niveau.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isFree"
              checked={isFree}
              onCheckedChange={setIsFree}
            />
            <Label htmlFor="isFree">{t('specialties.isFree')}</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              {t('common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
