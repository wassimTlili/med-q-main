'use client'

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CheckCircle, 
  BarChart3, 
  Users, 
  Star, 
  Filter,
  PieChart,
  Highlighter,
  Moon,
  ChevronDown,
  Facebook,
  Instagram,
  MessageCircle,
  Mail,
  ArrowRight,
  Play,
  Brain,
  Shield,
  Zap,
  Target,
  Clock,
  Smartphone,
  Tablet,
  Quote,
  RefreshCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Disable static generation to prevent SSR issues with useAuth
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Accueil');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update active nav item while scrolling based on visible section
  useEffect(() => {
    const sectionIds = ['accueil','caracteristiques','fonctionnalites','tarifs','faq'];
    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '-20% 0px -70% 0px', // Better detection zone
      threshold: [0, 0.1, 0.5, 1.0] // Multiple thresholds for better accuracy
    };
    const idToTab: Record<string,string> = {
      'accueil': 'Accueil',
      'caracteristiques': 'Caractéristiques',
      'fonctionnalites': 'Fonctionnalités',
      'tarifs': 'Tarifs',
      'faq': 'FAQ'
    };
    
    let observer: IntersectionObserver | null = null;
    
    // Additional scroll handler for top detection
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      // If we're at the very top, set active to Accueil
      if (scrollY < 100) {
        if (activeTab !== 'Accueil') {
          setActiveTab('Accueil');
        }
        return;
      }
      
      // Check which section is most visible
      const sections = sectionIds.slice(1).map(id => { // Skip accueil as it's handled above
        const element = document.getElementById(id);
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Calculate how much of the section is visible
        const visibleTop = Math.max(0, -rect.top);
        const visibleBottom = Math.min(rect.height, viewportHeight - rect.top);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibilityRatio = visibleHeight / viewportHeight;
        
        return {
          id,
          element,
          visibilityRatio,
          distanceFromCenter: Math.abs(rect.top + rect.height / 2 - viewportHeight / 2)
        };
      }).filter(Boolean);
      
      if (sections.length > 0) {
        // Find the section that's most prominently visible
        const mostVisible = sections.reduce((prev, current) => {
          if (!current) return prev; // type safety
          if (!prev) return current;
          // Prioritize sections that are more visible and closer to center
          const prevScore = prev.visibilityRatio - (prev.distanceFromCenter / 1000);
          const currentScore = current.visibilityRatio - (current.distanceFromCenter / 1000);
          return currentScore > prevScore ? current : prev;
        }, null as typeof sections[number] | null);
        
        if (mostVisible && mostVisible.visibilityRatio > 0.1) { // At least 10% visible
          const newTab = idToTab[mostVisible.id];
          if (newTab && newTab !== activeTab) {
            setActiveTab(newTab);
          }
        }
      }
    };
    
    try {
      // Intersection Observer as backup
      observer = new IntersectionObserver((entries) => {
        // Only use this if we're not at the top
        if (window.scrollY > 100) {
          const visible = entries
            .filter(e => e.isIntersecting && e.intersectionRatio > 0.1)
            .sort((a,b) => b.intersectionRatio - a.intersectionRatio);
          
          if (visible.length > 0) {
            const id = visible[0].target.id;
            if (idToTab[id] && idToTab[id] !== activeTab) {
              setActiveTab(idToTab[id]);
            }
          }
        }
      }, options);
      
      sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer!.observe(el);
      });
      
      // Add scroll listener
      window.addEventListener('scroll', handleScroll, { passive: true });
      
      // Initial check
      handleScroll();
      
    } catch (e) {
      // fail silently if IntersectionObserver not available
      console.warn('IntersectionObserver init failed', e);
    }
    
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab]);

  // Don't render anything while loading or if user is authenticated
  if (isLoading || user) {
    return null;
  }

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'accueil') {
      // Scroll to the very top of the page
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveTab('Accueil');
      return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      // Calculate offset to account for fixed navbar
      const navHeight = 64; // Height of the navbar
      const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetTop = elementTop - navHeight;
      
      window.scrollTo({ 
        top: offsetTop, 
        behavior: 'smooth' 
      });
      
      const sectionTabMap: Record<string, string> = {
        'accueil': 'Accueil',
        'caracteristiques': 'Caractéristiques', 
        'fonctionnalites': 'Fonctionnalités',
        'tarifs': 'Tarifs',
        'faq': 'FAQ'
      };
      
      if (sectionTabMap[sectionId]) {
        // Set active tab immediately for better UX
        setActiveTab(sectionTabMap[sectionId]);
      }
    }
  };

  const characteristics = [
  { icon: <Highlighter className="w-8 h-8 text-medblue-500" />, title: 'Apprentissage actif', description: 'Surlignez, prenez des notes, épinglez vos questions importantes : un espace d’étude 100% personnalisé.' },
  { icon: <BarChart3 className="w-8 h-8 text-medblue-600" />, title: 'Analyse de progression', description: 'Statistiques détaillées pour visualiser vos forces et cibler précisément vos points faibles.' },
    { icon: <Users className="w-8 h-8 text-medblue-500" />, title: 'Apprentissage collaboratif', description: 'Commentez chaque question ou cours, partagez vos astuces, révisez ensemble.' },
  { icon: <RefreshCcw className="w-8 h-8 text-medblue-600" />, title: 'Mises à jour continues', description: 'Plateforme interactive enrichie et ajustée régulièrement.' },
    { icon: <Clock className="w-8 h-8 text-medblue-500" />, title: 'Accessibilité totale', description: 'Étudiez à votre rythme, où que vous soyez, accès 24h/24.' },
  { icon: <Shield className="w-8 h-8 text-medblue-600" />, title: 'Simplicité & sécurité', description: 'Paiement simple (en ligne, virement, espèces) et données protégées.' }
  ];

  const features = [
    { 
      title: 'Statistiques détaillées', 
      description: 'Vue d’ensemble de vos performances + suivi par spécialité et question.', 
  icon: <PieChart className="w-12 h-12 text-medblue-600" />,
      screenshots: ['/screenshot-dashboard.png', '/screenshot-course.png'],
      alt: 'Dashboard & page de cours'
    },
    { 
      title: 'Commentaire', 
      description: 'Discutez chaque question ou cours avec la communauté.', 
  icon: <MessageCircle className="w-12 h-12 text-medblue-600" />,
      screenshots: ['/screenshot-comments.png'],
      alt: 'Commentaires'
    },
    { 
      title: 'Préparez vos sessions', 
      description: 'Organisation ciblée pour aborder les sessions plus facilement.', 
      icon: <Target className="w-12 h-12 text-medblue-600" />,
      // NOTE: png manquant dans public (seulement .svg). Mettre le bon fichier png ou laisser svg provisoire.
      screenshots: ['/screenshot-sessions.png'],
      alt: 'Préparation des sessions'
    },
    { 
      title: 'Prise de note, surligner & épingler', 
      description: 'Annotations personnelles pour mémorisation active.', 
  icon: <Highlighter className="w-12 h-12 text-medblue-600" />,
      screenshots: ['/screenshot-annotations.png'],
      alt: 'Annotations et notes'
    },
    { 
      title: 'Réviser efficacement à ton rythme', 
      description: 'Filtres puissants + Study modes pour un apprentissage flexible.', 
      icon: <Brain className="w-12 h-12 text-medblue-600" />,
      screenshots: ['/screenshot-filters.png', '/screenshot-study-modes.png'],
      alt: 'Filtres et modes d\'étude'
    }
  ];

  const additionalFeatures = [
    {
      title: "Mode Hors Ligne",
      description: "Continuez à étudier même sans connexion internet. Vos progrès se synchronisent automatiquement dès que vous êtes reconnecté.",
  icon: <Zap className="w-8 h-8 text-medblue-600" />
    },
    {
      title: "Interface Adaptative",
      description: "Notre interface s'adapte parfaitement à tous vos appareils : smartphone, tablette ou ordinateur pour une expérience optimale.",
  icon: <Smartphone className="w-8 h-8 text-medblue-600" />
    },
    {
      title: "Mode Sombre",
      description: "Réduisez la fatigue oculaire lors de longues sessions d'étude avec notre mode sombre élégant et reposant.",
  icon: <Moon className="w-8 h-8 text-medblue-600" />
    }
  ];

  const pricingPlans = [
    { name: 'Annuel', price: '----', popular: true },
    { name: 'Semestriel', price: '----', popular: false }
  ];
  const pricingCurrency = 'DA';

  const testimonials = [
    { name: 'Inès B.', level: 'Étudiante en 5ème année', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1', text: 'Grâce aux annotations et aux statistiques, j’ai enfin une vision claire de mes révisions. MedQ a transformé ma méthode de travail.' },
    { name: 'Yassine M.', level: 'Externe', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student2', text: 'Les commentaires sous les questions me font gagner un temps fou. On apprend vraiment en communauté.' },
    { name: 'Sarra K.', level: 'Interne', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student3', text: 'Plateforme fluide, outils utiles et tarifs raisonnables. J’attends chaque mise à jour avec impatience.' }
  ];

  const faqItems = [
    { question: 'Quels sont les modes de paiement acceptés ?', answer: 'Paiement en ligne (carte bancaire, D17, etc.), par virement ou en espèces via code. Simples et sécurisés.' },
    { question: 'Puis-je utiliser MedQ sur plusieurs appareils ?', answer: 'Oui, accès multi‑appareils synchronisé automatiquement (ordinateur, tablette, mobile).' },
    { question: 'Le contenu est-il régulièrement mis à jour ?', answer: 'Oui, nouvelles questions, corrections et améliorations fonctionnelles sont publiées de façon continue.' },
    { question: 'Y a-t-il une période d\'essai gratuite ?', answer: 'Pas de période d\'essai limitée, mais des cours gratuits accessibles à tout moment pour tester la plateforme.' },
    { question: 'Notre politique tarifaire & rapport qualité/prix ?', answer: 'Un prix juste pour une qualité maximale. Moins cher que l\'impression papier, plus riche en fonctionnalités. Promos régulières + outils premium pour optimiser vos révisions.' },
    { question: 'Comment activer mon abonnement via un code de paiement ?', answer: 'Après le paiement (virement / espèces), saisissez votre code reçu dans la section abonnement de votre profil pour activer immédiatement.' }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 1s ease-out;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        /* Force perfect white background for ALL content areas */
        body {
          background-color: #ffffff !important;
        }
        
        main {
          background-color: #ffffff !important;
        }
        
        section[id="caracteristiques"],
        section[id="fonctionnalites"],
        section[id="tarifs"],
        section[id="faq"],
        .content-section {
          background-color: #ffffff !important;
        }
        
        /* Remove any inherited backgrounds */
        .bg-gray-50,
        .bg-slate-50,
        .bg-neutral-50,
        .bg-stone-50 {
          background-color: #ffffff !important;
        }
        
        /* Force all cards to be white */
        .card,
        [data-state="open"],
        [data-state="closed"] {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        
        /* Ensure card headers and content are white */
        .card-header,
        .card-content,
        .card-footer {
          background-color: #ffffff !important;
        }
      `}</style>

      {/* Navigation */}
      <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${
         isScrolled 
           ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200' 
           : 'bg-transparent'
       }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 md:h-16">
             <div className="flex items-center">
               <h1 className={`text-xl md:text-2xl font-bold transition-colors ${
                 isScrolled ? 'text-medblue-600' : 'text-white'
               }`}>
                 MedQ
               </h1>
             </div>
             <div className="hidden md:flex space-x-8">
               {[
                 { name: 'Accueil', id: 'accueil' },
                 { name: 'Caractéristiques', id: 'caracteristiques' },
                 { name: 'Fonctionnalités', id: 'fonctionnalites' },
                 { name: 'Tarifs', id: 'tarifs' },
                 { name: 'FAQ', id: 'faq' }
               ].map((item) => (
                 <button
                   key={item.name}
                   onClick={() => scrollToSection(item.id)}
                   className={`px-4 py-2 font-medium transition-all duration-200 relative ${
                     activeTab === item.name
                       ? isScrolled 
                         ? 'text-medblue-600 border-b-2 border-medblue-600' 
                         : 'text-white border-b-2 border-white'
                       : isScrolled
                         ? 'text-gray-900 hover:text-medblue-600'
                         : 'text-white/80 hover:text-white'
                   }`}
                 >
                   {item.name}
                 </button>
               ))}
             </div>
            <div className="flex space-x-3 md:space-x-4">
               <Button 
                 variant="outline" 
                 onClick={() => router.push('/auth')}
                 className={`bg-transparent text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2 rounded-lg ${isScrolled 
                   ? 'border-medblue-600 text-medblue-600 hover:bg-medblue-50' 
                   : 'border-white text-white hover:bg-white hover:text-medblue-600'
                 }`}
               >
                 Connexion
               </Button>
               <Button 
                 onClick={() => router.push('/auth')}
                 className="bg-medblue-600 hover:bg-medblue-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
               >
                 Commencer
               </Button>
             </div>
           </div>
         </div>
       </nav>

       {/* Hero Section */}
       <section id="accueil" className="relative min-h-screen flex items-center justify-center overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-medblue-700 via-medblue-800 to-medblue-900"></div>
        
        {/* ONE BIG DRAMATIC CURVE */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden z-20 pointer-events-none">
          <svg
            className="relative block w-full h-40 md:h-48 lg:h-56"
            viewBox="0 0 1200 400"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1"/>
              </linearGradient>
            </defs>
            <path
              d="M0,200 C300,120 400,280 600,160 C800,80 900,220 1200,140 L1200,400 L0,400 Z"
              fill="url(#waveGradient)"
            />
          </svg>
        </div>
        
        <div className="absolute inset-0 bg-black/10 z-0"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 z-10">
          <div className="grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
             <div className="text-white space-y-8">
               <Badge className="inline-flex bg-white/20 text-white border-white/30 backdrop-blur-sm shadow-lg">
                 1ère plateforme pensée pour les externes en médecine
               </Badge>
               <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight animate-fade-in">
                 Med<span className="text-medblue-300 bg-gradient-to-r from-medblue-300 to-medblue-400 bg-clip-text text-transparent">Q</span>
               </h1>
               <p className="text-base md:text-lg lg:text-xl text-medblue-100 animate-slide-up font-semibold tracking-wide">
                 Révisez • Progressez • Réussissez
               </p>
               <p className="text-sm md:text-base opacity-90 leading-relaxed animate-slide-up max-w-2xl" style={{ animationDelay: '0.2s' }}>
                 Facilitez vos révisions avec des questions récentes, des annotations personnelles, des commentaires collaboratifs et des statistiques intelligentes. Un écosystème complet pour apprendre mieux et plus vite.
               </p>
               <div className="flex flex-col sm:flex-row gap-4">
                 <Button 
                   size="lg"
                   onClick={() => router.push('/auth')}
                   className="bg-white text-medblue-600 hover:bg-medblue-50 font-bold text-lg md:text-xl px-8 md:px-10 py-4 md:py-5 shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl border-2 border-white hover:border-medblue-200"
                 >
                   <span className="flex items-center gap-3">
                     Commencer
                     <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                   </span>
                 </Button>
               </div>
             </div>
            <div className="hidden md:flex justify-center lg:justify-end">
              <div className="relative animate-float">
                {/* Main Device - Smaller */}
                <div className="w-72 h-80 md:w-80 md:h-[24rem] bg-white rounded-3xl shadow-2xl p-4 md:p-6 transform rotate-1 hover:rotate-0 transition-all duration-500 hover:shadow-3xl border border-gray-100">
                   <div className="h-full bg-gradient-to-br from-medblue-50 via-medblue-100 to-medblue-150 rounded-2xl p-3 md:p-4 flex flex-col relative overflow-hidden">
                     {/* Subtle background pattern */}
                     <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                    
                    {/* Header */}
                    <div className="relative z-10 flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-medblue-600 to-medblue-700 rounded-full flex items-center justify-center shadow-lg">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 text-lg">Question MCQ</span>
                        <div className="text-xs text-medblue-600 font-medium">Cardiologie • Niveau 3</div>
                      </div>
                    </div>
                    
                    {/* Question Content */}
                    <div className="relative z-10 flex-1 space-y-4">
                      <div className="space-y-2 p-3 bg-white/60 rounded-xl backdrop-blur-sm">
                        <div className="h-3 bg-gradient-to-r from-gray-300 to-gray-200 rounded w-full animate-pulse"></div>
                        <div className="h-3 bg-gradient-to-r from-gray-300 to-gray-200 rounded w-5/6 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                        <div className="h-3 bg-gradient-to-r from-gray-300 to-gray-200 rounded w-4/5 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="h-3 bg-gradient-to-r from-gray-300 to-gray-200 rounded w-3/4 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                      </div>
                      
                      {/* Answer Options */}
                      <div className="space-y-3 mt-6">
                        <div className="p-3 bg-white/80 rounded-xl border-2 border-gray-200 hover:border-medblue-300 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-md">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                            <div className="h-2 bg-gray-300 rounded w-4/5"></div>
                          </div>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-medblue-100 to-medblue-50 rounded-xl border-2 border-medblue-400 shadow-md transform scale-105">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-medblue-600 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                            <div className="h-2 bg-medblue-500 rounded w-3/5"></div>
                          </div>
                        </div>
                        <div className="p-3 bg-white/80 rounded-xl border-2 border-gray-200 hover:border-medblue-300 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-md">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                            <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                          </div>
                        </div>
                        <div className="p-3 bg-white/80 rounded-xl border-2 border-gray-200 hover:border-medblue-300 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-md">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                            <div className="h-2 bg-gray-300 rounded w-2/3"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Footer */}
                      <div className="mt-6 pt-4 border-t border-white/50">
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-600 font-medium">Question 7/20</div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="w-7 h-1.5 bg-gradient-to-r from-medblue-500 to-medblue-600 rounded-full"></div>
                            </div>
                            <span className="text-xs text-gray-500">35%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mobile Device - Smaller */}
                <div className="absolute -right-6 md:-right-8 top-12 md:top-16 w-20 h-40 md:w-24 md:h-48 bg-white rounded-3xl shadow-2xl p-3 transform -rotate-12 hover:rotate-6 transition-all duration-500 border border-gray-100">
                  <div className="h-full bg-gradient-to-b from-medblue-100 via-medblue-200 to-medblue-300 rounded-2xl p-2 flex flex-col relative overflow-hidden">
                    {/* Mobile header */}
                    <div className="w-full h-0.5 bg-gray-400 rounded-full mb-2"></div>
                    <div className="w-8 h-8 bg-medblue-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="h-2 bg-medblue-300 rounded w-full"></div>
                      <div className="h-1.5 bg-gray-300 rounded w-4/5"></div>
                      <div className="h-1.5 bg-gray-300 rounded w-3/5"></div>
                      
                      <div className="grid grid-cols-2 gap-1 mt-3">
                        <div className="h-6 bg-white rounded-md shadow-sm"></div>
                        <div className="h-6 bg-medblue-200 rounded-md"></div>
                        <div className="h-6 bg-white rounded-md shadow-sm"></div>
                        <div className="h-6 bg-white rounded-md shadow-sm"></div>
                      </div>
                      
                      <div className="mt-3 pt-1.5 border-t border-gray-200">
                        <div className="h-0.5 bg-medblue-500 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tablet Device - Smaller */}
                <div className="absolute -left-8 md:-left-12 top-20 md:top-24 w-32 h-20 md:w-36 md:h-24 bg-white rounded-2xl shadow-2xl p-3 transform rotate-12 hover:rotate-6 transition-all duration-500 border border-gray-100">
                  <div className="h-full bg-gradient-to-r from-medblue-100 via-medblue-200 to-medblue-300 rounded-xl p-2 flex items-center justify-center relative overflow-hidden">
                    {/* Tablet content */}
                    <div className="text-center w-full">
                      <div className="w-8 h-8 bg-gradient-to-br from-medblue-500 to-medblue-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <Tablet className="w-4 h-4 text-white" />
                      </div>
                      <div className="space-y-1">
                        <div className="h-1.5 bg-medblue-300 rounded w-16 mx-auto"></div>
                        <div className="h-1 bg-gray-300 rounded w-12 mx-auto"></div>
                        <div className="h-1 bg-gray-300 rounded w-10 mx-auto"></div>
                      </div>
                      
                      <div className="flex justify-center gap-1 mt-2">
                        <div className="w-1.5 h-1.5 bg-medblue-400 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements for Extra Appeal */}
                <div className="absolute top-8 left-8 w-4 h-4 bg-medblue-400 rounded-full animate-ping opacity-75"></div>
                <div className="absolute bottom-16 right-16 w-6 h-6 bg-medblue-300 rounded-full animate-bounce opacity-60" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-32 -left-4 w-3 h-3 bg-medblue-500 rounded-full animate-pulse opacity-50" style={{ animationDelay: '2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Characteristics Section */}
      <section id="caracteristiques" className="content-section py-14 md:py-20 bg-white" style={{ margin: 0 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Caractéristiques</h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">Tout ce dont vous avez besoin pour structurer une révision moderne, active et collaborative.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
             {characteristics.map((char, index) => (
               <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white shadow-md">
                 <CardHeader className="text-center pb-4">
                   <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                     {char.icon}
                   </div>
                   <CardTitle className="text-xl font-bold text-gray-900">{char.title}</CardTitle>
                 </CardHeader>
                 <CardContent className="text-center">
                   <CardDescription className="text-gray-600 leading-relaxed">
                     {char.description}
                   </CardDescription>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
       </section>

       {/* Features Section */}
       <section id="fonctionnalites" className="content-section py-14 md:py-20 bg-white" style={{ margin: 0 }}>
         <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Fonctionnalités</h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">Des outils concrets pour améliorer l’efficacité de chaque session d’étude.</p>
          </div>
          {/* Row 1: 3 cards */}
          <div className="grid md:grid-cols-3 gap-10 mb-14">
            {features.slice(0,3).map(f => (
              <div key={f.title} className="group relative bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl transition-all overflow-hidden">
                <div className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-medblue-100 to-medblue-200 flex items-center justify-center group-hover:scale-110 transition-transform">{f.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-gray-600 leading-snug">{f.description}</p>
                  </div>
                </div>
                <div className="relative mt-2 px-5 pb-5">
                  <div className="relative rounded-2xl ring-1 ring-gray-200 overflow-hidden bg-gradient-to-br from-gray-50 to-white">
                    <div className="relative w-full h-0 pb-[62.5%]">{/* 8/5 ratio */}
                      {/* Fallback si image 404 */}
                      <Image
                        src={f.screenshots[0]}
                        alt={f.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover object-top [&[data-error='true']]:opacity-30"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.setAttribute('data-error','true');
                          console.warn('Image introuvable:', f.screenshots[0]);
                        }}
                      />
                      <div className="absolute inset-0 hidden items-center justify-center text-xs text-gray-500 gap-2" data-placeholder>
                        <span>{f.screenshots[0]}</span>
                      </div>
                    </div>
                    {f.screenshots[1] && (
                      <div className="hidden md:block absolute bottom-3 right-3 w-32 h-20 rounded-lg ring-1 ring-white shadow-lg overflow-hidden bg-white/80">
                        <Image
                          src={f.screenshots[1]}
                          alt={f.alt + ' secondaire'}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Row 2: 2 centered cards */}
          <div className="grid md:grid-cols-2 gap-10 md:max-w-4xl mx-auto">
            {features.slice(3).map(f => (
              <div key={f.title} className="group relative bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl transition-all overflow-hidden">
                <div className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-medblue-100 to-medblue-200 flex items-center justify-center group-hover:scale-110 transition-transform">{f.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-gray-600 leading-snug">{f.description}</p>
                  </div>
                </div>
                <div className="relative mt-2 px-5 pb-5">
                  <div className="relative rounded-2xl ring-1 ring-gray-200 overflow-hidden bg-gradient-to-br from-gray-50 to-white">
                    <div className="relative w-full h-0 pb-[62.5%]">
                      <Image
                        src={f.screenshots[0]}
                        alt={f.alt}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover object-top [&[data-error='true']]:opacity-30"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.setAttribute('data-error','true');
                          console.warn('Image introuvable:', f.screenshots[0]);
                        }}
                      />
                    </div>
                    {f.screenshots[1] && (
                      <div className="hidden md:block absolute bottom-3 right-3 w-32 h-20 rounded-lg ring-1 ring-white shadow-lg overflow-hidden bg-white/80">
                        <Image
                          src={f.screenshots[1]}
                          alt={f.alt + ' secondaire'}
                          fill
                          sizes="128px"
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

           {/* Additional Features */}
           <div className="bg-white rounded-3xl p-8 lg:p-12 border border-gray-100">
             <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
               Fonctionnalités Supplémentaires
             </h3>
             <div className="grid md:grid-cols-3 gap-8">
               {additionalFeatures.map((feature, index) => (
                 <div key={index} className="text-center group">
                   <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                     {feature.icon}
                   </div>
                   <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                   <p className="text-gray-600">{feature.description}</p>
                 </div>
               ))}
             </div>
           </div>
         </div>
       </section>

       {/* Testimonials */}
       <section className="content-section py-14 md:py-20 bg-white" style={{ margin: 0 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Témoignages de nos utilisateurs</h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">Ils utilisent MedQ au quotidien pour structurer, accélérer et sécuriser leurs révisions.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map(t => (
              <Card key={t.name} className="border border-gray-200 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <img src={t.photo} alt={t.name} className="w-14 h-14 rounded-full object-cover border border-medblue-200" />
                    <div>
                      <CardTitle className="text-lg text-gray-900 font-semibold">{t.name}</CardTitle>
                      <CardDescription className="text-medblue-600 font-medium">{t.level}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Quote className="w-8 h-8 text-medblue-400 mb-3" />
                  <p className="text-gray-600 leading-relaxed text-sm">{t.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
         </div>
       </section>

       {/* Pricing Section - Nouveau design minimaliste des cartes */}
       <section id="tarifs" className="content-section py-14 md:py-20 bg-white" style={{ margin: 0 }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">Tarifs</h2>
            <p className="text-xs md:text-sm text-gray-500 font-medium tracking-wide uppercase">Politique tarifaire rationnelle & juste : meilleur rapport qualité / prix</p>
          </div>
          <div className="max-w-xl mx-auto grid grid-cols-2 gap-4 md:gap-6">
            {pricingPlans.map((plan, i) => (
              <div
                key={plan.name}
                className={`group relative rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-300 ${plan.popular ? 'ring-1 ring-medblue-500/70' : ''} min-h-[210px] md:min-h-[230px] flex flex-col`}
              >
                <div className={`h-12 flex items-center justify-center text-[11px] font-semibold tracking-wide text-white bg-medblue-600`}> 
                  {plan.name.toUpperCase()}
                </div>
                <div className="flex-1 p-6 pt-7 flex flex-col items-center justify-center gap-7">
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                      {pricingCurrency}
                    </span>
                    <span className="text-4xl font-extrabold text-slate-700 leading-none">
                      {plan.price}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/auth')}
                    className="rounded-full bg-white border border-gray-300 hover:bg-medblue-600 hover:text-white text-gray-700 px-6 py-1.5 text-sm font-medium transition-colors duration-200 shadow-sm"
                  >
                    Pré‑inscription
                  </Button>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                {plan.popular && (
                  <div className="absolute -top-2 -right-10 rotate-45 bg-gradient-to-r from-medblue-500 to-medblue-600 text-white text-[10px] font-semibold py-1 px-12 shadow-lg">
                    POPULAIRE
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
       </section>

       {/* FAQ Section */}
       <section id="faq" className="content-section py-14 md:py-20 bg-white" style={{ margin: 0 }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">FAQ</h2>
            <p className="text-lg md:text-xl text-gray-600">Les réponses aux questions les plus fréquentes.</p>
          </div>
          <div className="space-y-4">
             {faqItems.map((item, index) => (
               <Card key={index} className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-all duration-200">
                 <button
                   onClick={() => toggleFAQ(index)}
                   className="w-full text-left p-6 flex items-center justify-between hover:bg-medblue-50 transition-colors"
                 >
                   <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                   <ChevronDown
                     className={`w-5 h-5 text-medblue-500 transition-transform duration-200 ${
                       openFAQ === index ? 'rotate-180' : ''
                     }`}
                   />
                 </button>
                 {openFAQ === index && (
                   <div className="px-6 pb-6 border-t border-gray-100 bg-medblue-50">
                     <p className="text-gray-600 leading-relaxed pt-4">{item.answer}</p>
                   </div>
                 )}
               </Card>
             ))}
           </div>
         </div>
       </section>

       {/* CTA Section */}
       <section className="py-16 md:py-20 bg-gradient-to-br from-medblue-600 to-medblue-800">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
           <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
             Prêt à Exceller en Médecine ?
           </h2>
           <p className="text-lg md:text-xl text-medblue-100 mb-8 max-w-2xl mx-auto">
             Rejoignez des milliers d'étudiants qui ont déjà choisi MedQ pour réussir leurs examens médicaux.
           </p>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Button 
               size="lg"
               onClick={() => router.push('/auth')}
               className="bg-white text-medblue-600 hover:bg-medblue-50 font-semibold text-lg px-8 py-4 shadow-lg transform hover:scale-105 transition-all duration-200"
             >
               Commencer maintenant
               <ArrowRight className="ml-2 w-5 h-5" />
             </Button>
             <Button 
               size="lg"
               variant="outline"
               className="border-white text-medblue-600 hover:bg-white hover:text-medblue-600 font-semibold text-lg px-8 py-4 shadow-lg transform hover:scale-105 transition-all duration-200"
             >
               Essai gratuit 7 jours
             </Button>
           </div>
         </div>
       </section>

       {/* Footer */}
       <footer className="bg-gradient-to-br from-gray-800 to-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
           <div className="grid md:grid-cols-4 gap-8 mb-12">
             <div>
               <h3 className="text-2xl font-bold mb-4 text-medblue-300">MedQ</h3>
               <p className="text-gray-300 leading-relaxed">
                 La plateforme d'apprentissage médical de référence pour les étudiants ambitieux.
               </p>
             </div>
             <div>
               <h4 className="font-semibold mb-4 text-white">Plateforme</h4>
               <ul className="space-y-2 text-gray-300">
                 <li><a href="#" className="hover:text-medblue-300 transition-colors">Fonctionnalités</a></li>
                 <li><a href="#" className="hover:text-medblue-300 transition-colors">Tarifs</a></li>
                 <li><a href="#" className="hover:text-medblue-300 transition-colors">Support</a></li>
               </ul>
             </div>
             <div>
               <h4 className="font-semibold mb-4 text-white">Ressources</h4>
               <ul className="space-y-2 text-gray-300">
                 <li><a href="#" className="hover:text-medblue-300 transition-colors">Guide d'utilisation</a></li>
                 <li><a href="#" className="hover:text-medblue-300 transition-colors">FAQ</a></li>
                 <li><a href="#" className="hover:text-medblue-300 transition-colors">Contact</a></li>
               </ul>
             </div>
             <div>
               <h4 className="font-semibold mb-4 text-white">Suivez-nous</h4>
               <div className="flex space-x-4">
                 <a href="#" className="w-10 h-10 bg-medblue-600 rounded-full flex items-center justify-center hover:bg-medblue-700 transition-colors transform hover:scale-110 duration-200">
                   <Facebook className="w-5 h-5" />
                 </a>
                 <a href="#" className="w-10 h-10 bg-medblue-600 rounded-full flex items-center justify-center hover:bg-medblue-700 transition-colors transform hover:scale-110 duration-200">
                   <Instagram className="w-5 h-5" />
                 </a>
                 <a href="#" className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors transform hover:scale-110 duration-200">
                   <MessageCircle className="w-5 h-5" />
                 </a>
                 <a href="#" className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors transform hover:scale-110 duration-200">
                   <Mail className="w-5 h-5" />
                 </a>
               </div>
             </div>
           </div>
           <div className="border-t border-gray-700 pt-8 text-center">
             <p className="text-gray-400">
               © 2024-2025 MedQ. Tous droits réservés. | 
               <a href="#" className="hover:text-medblue-300 ml-2">Politique de confidentialité</a> | 
               <a href="#" className="hover:text-medblue-300 ml-2">Conditions d'utilisation</a>
             </p>
           </div>
         </div>
       </footer>
     </div>
   );
 }