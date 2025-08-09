'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CheckCircle, 
  BarChart3, 
  Users, 
  Settings, 
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
  BookOpen,
  Brain,
  Trophy,
  Shield,
  Zap,
  Target,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  ChevronRight,
  Quote
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
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const sectionTabMap: Record<string, string> = {
        'accueil': 'Accueil',
        'caracteristiques': 'Caractéristiques', 
        'fonctionnalites': 'Fonctionnalités',
        'tarifs': 'Tarifs',
        'faq': 'FAQ'
      };
      if (sectionTabMap[sectionId]) {
        setActiveTab(sectionTabMap[sectionId]);
      }
    }
  };

  const characteristics = [
    {
      icon: <Brain className="w-8 h-8 text-purple-500" />,
      title: "Intelligence Médicale",
      description: "Questions conçues par des experts médicaux pour une préparation optimale aux examens"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-blue-500" />,
      title: "Analyses Avancées",
      description: "Suivez vos progrès avec des statistiques détaillées et des rapports personnalisés"
    },
    {
      icon: <Target className="w-8 h-8 text-purple-500" />,
      title: "Apprentissage Ciblé",
      description: "Identifiez vos points faibles et concentrez-vous sur les domaines à améliorer"
    },
    {
      icon: <Clock className="w-8 h-8 text-blue-500" />,
      title: "Flexibilité Totale",
      description: "Étudiez à votre rythme, où que vous soyez, avec un accès 24h/24"
    },
    {
      icon: <Trophy className="w-8 h-8 text-purple-500" />,
      title: "Résultats Prouvés",
      description: "Méthodes validées par des milliers d'étudiants en médecine qui ont réussi"
    },
    {
      icon: <Shield className="w-8 h-8 text-blue-500" />,
      title: "Sécurité & Fiabilité",
      description: "Plateforme sécurisée avec sauvegarde automatique de vos progrès"
    }
  ];

  const features = [
    {
      title: "Questions MCQ & QROC",
      description: "Entraînez-vous avec des questions à choix multiples et des questions rédactionnelles ouvertes courtes, fidèles aux formats d'examens réels. Notre base de données contient des milliers de questions classées par spécialité.",
      icon: <BookOpen className="w-12 h-12 text-purple-600" />
    },
    {
      title: "Cas Cliniques Interactifs", 
      description: "Résolvez des cas cliniques complexes avec des scenarios réalistes. Développez votre raisonnement médical à travers des situations authentiques rencontrées en pratique clinique.",
      icon: <Users className="w-12 h-12 text-blue-600" />
    },
    {
      title: "Spécialités Médicales",
      description: "Explorez toutes les spécialités médicales avec du contenu organisé par niveau d'étude. De la première année aux spécialisations, trouvez le contenu adapté à votre parcours.",
      icon: <Filter className="w-12 h-12 text-purple-600" />
    },
    {
      title: "Suivi de Progression",
      description: "Visualisez vos performances en temps réel avec des graphiques détaillés. Identifiez vos forces et faiblesses pour optimiser votre temps d'étude et maximiser vos chances de réussite.",
      icon: <BarChart3 className="w-12 h-12 text-blue-600" />
    }
  ];

  const additionalFeatures = [
    {
      title: "Mode Hors Ligne",
      description: "Continuez à étudier même sans connexion internet. Vos progrès se synchronisent automatiquement dès que vous êtes reconnecté.",
      icon: <Zap className="w-8 h-8 text-purple-500" />
    },
    {
      title: "Interface Adaptative",
      description: "Notre interface s'adapte parfaitement à tous vos appareils : smartphone, tablette ou ordinateur pour une expérience optimale.",
      icon: <Smartphone className="w-8 h-8 text-blue-500" />
    },
    {
      title: "Mode Sombre",
      description: "Réduisez la fatigue oculaire lors de longues sessions d'étude avec notre mode sombre élégant et reposant.",
      icon: <Moon className="w-8 h-8 text-purple-500" />
    }
  ];

  const pricingPlans = [
    { 
      name: "Externe", 
      price: "2500", 
      duration: "5 ans",
      popular: true,
      features: ["Accès complet", "Toutes spécialités", "Cas cliniques", "Suivi détaillé"]
    },
    { 
      name: "Interne", 
      price: "1800", 
      duration: "3 ans",
      popular: false,
      features: ["Spécialisations", "QCM avancés", "Analyses", "Support prioritaire"]
    },
    { 
      name: "Résidanat", 
      price: "1200", 
      duration: "2 ans",
      popular: false,
      features: ["Préparation résidanat", "Questions récentes", "Simulations", "Coaching"]
    },
    { 
      name: "Étudiant", 
      price: "600", 
      duration: "1 an",
      popular: false,
      features: ["Cours de base", "QCM essentiels", "Suivi simple", "Support standard"]
    }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Ben Ahmed",
      role: "Externe en Cardiologie",
      content: "MedQ m'a permis de réussir mes examens avec brio. Les cas cliniques sont particulièrement réalistes et m'ont préparée aux situations réelles.",
      avatar: "👩‍⚕️",
      rating: 5
    },
    {
      name: "Mohamed Trabelsi",
      role: "Interne en Neurologie", 
      content: "L'analyse des performances m'aide à identifier mes lacunes. Je recommande vivement cette plateforme à tous les étudiants en médecine.",
      avatar: "👨‍⚕️",
      rating: 5
    },
    {
      name: "Dr. Amira Sfaxi",
      role: "Résidente en Pédiatrie",
      content: "Interface intuitive et contenu de qualité. MedQ est devenu un outil indispensable dans ma préparation aux examens de spécialisation.",
      avatar: "👩‍⚕️",
      rating: 5
    }
  ];

  const faqItems = [
    {
      question: "Comment créer un compte MedQ ?",
      answer: "Cliquez sur 'Créer un compte' et suivez les étapes simples d'inscription. Vous aurez besoin d'une adresse email valide et de choisir votre niveau d'étude."
    },
    {
      question: "Quels sont les modes de paiement acceptés ?",
      answer: "Nous acceptons les cartes bancaires, les virements et le paiement mobile. Tous les paiements sont sécurisés et cryptés."
    },
    {
      question: "Puis-je utiliser MedQ sur plusieurs appareils ?",
      answer: "Oui, votre compte se synchronise automatiquement sur tous vos appareils. Commencez sur votre ordinateur et continuez sur votre smartphone."
    },
    {
      question: "Y a-t-il une période d'essai gratuite ?",
      answer: "Oui, nous offrons 7 jours d'essai gratuit pour découvrir toutes les fonctionnalités de la plateforme sans engagement."
    },
    {
      question: "Le contenu est-il régulièrement mis à jour ?",
      answer: "Notre équipe d'experts médicaux met à jour le contenu régulièrement pour refléter les dernières avancées et recommandations médicales."
    },
    {
      question: "Puis-je télécharger du contenu hors ligne ?",
      answer: "Oui, vous pouvez télécharger les questions et cas cliniques pour étudier même sans connexion internet."
    }
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
                 isScrolled ? 'text-purple-600' : 'text-white'
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
                         ? 'text-purple-600 border-b-2 border-purple-600' 
                         : 'text-white border-b-2 border-white'
                       : isScrolled
                         ? 'text-gray-900 hover:text-purple-600'
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
                   ? 'border-purple-600 text-purple-600 hover:bg-purple-50' 
                   : 'border-white text-white hover:bg-white hover:text-purple-600'
                 }`}
               >
                 Connexion
               </Button>
               <Button 
                 onClick={() => router.push('/auth')}
                 className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200"
               >
                 Commencer
               </Button>
             </div>
           </div>
         </div>
       </nav>

       {/* Hero Section */}
       <section id="accueil" className="relative min-h-screen flex items-center justify-center overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800"></div>
        
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
                 🏥 Plateforme d'apprentissage médical de nouvelle génération
               </Badge>
               <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight animate-fade-in">
                 Med<span className="text-purple-300 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">Q</span>
               </h1>
               <p className="text-base md:text-lg lg:text-xl text-purple-100 animate-slide-up font-medium">
                 La plateforme d'excellence pour les étudiants en médecine
               </p>
               <p className="text-sm md:text-base opacity-90 leading-relaxed animate-slide-up max-w-2xl" style={{ animationDelay: '0.2s' }}>
                 Préparez-vous aux examens médicaux avec des milliers de questions, 
                 des cas cliniques authentiques et un suivi personnalisé de vos progrès. 
                 Rejoignez une communauté d'excellence médicale.
               </p>
               <div className="flex flex-col sm:flex-row gap-4">
                 <Button 
                   size="lg"
                   onClick={() => router.push('/auth')}
                   className="bg-white text-purple-600 hover:bg-purple-50 font-bold text-lg md:text-xl px-8 md:px-10 py-4 md:py-5 shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl border-2 border-white hover:border-purple-200"
                 >
                   <span className="flex items-center gap-3">
                     Commencer gratuitement
                     <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                   </span>
                 </Button>
                 <Button 
                   size="lg"
                   variant="outline"
                   onClick={() => scrollToSection('fonctionnalites')}
                   className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-purple-600 font-semibold text-sm md:text-base px-5 md:px-6 py-3 md:py-3.5 shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-xl backdrop-blur-sm"
                 >
                   <span className="flex items-center gap-3">
                     <Play className="w-5 h-5 md:w-6 md:h-6" />
                     Voir la démo
                   </span>
                 </Button>
               </div>
               <div className="inline-flex w-auto self-start items-center justify-start gap-3 sm:gap-4 animate-slide-up bg-white/10 backdrop-blur-md rounded-lg p-2 md:p-3 border border-white/20" style={{ animationDelay: '0.6s' }}>
                 <div className="text-center">
                   <div className="text-lg md:text-xl font-bold text-white">10K+</div>
                   <div className="text-purple-200 text-[10px] md:text-xs font-medium">Questions</div>
                 </div>
                 <div className="text-center">
                   <div className="text-lg md:text-xl font-bold text-white">500+</div>
                   <div className="text-purple-200 text-[10px] md:text-xs font-medium">Cas cliniques</div>
                 </div>
                 <div className="text-center">
                   <div className="text-lg md:text-xl font-bold text-white">15+</div>
                   <div className="text-purple-200 text-[10px] md:text-xs font-medium">Spécialités</div>
                 </div>
               </div>
             </div>
            <div className="hidden md:flex justify-center lg:justify-end">
              <div className="relative animate-float">
                {/* Main Device - Smaller */}
                <div className="w-72 h-80 md:w-80 md:h-[24rem] bg-white rounded-3xl shadow-2xl p-4 md:p-6 transform rotate-1 hover:rotate-0 transition-all duration-500 hover:shadow-3xl border border-gray-100">
                   <div className="h-full bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-2xl p-3 md:p-4 flex flex-col relative overflow-hidden">
                     {/* Subtle background pattern */}
                     <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                    
                    {/* Header */}
                    <div className="relative z-10 flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-lg">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-bold text-gray-800 text-lg">Question MCQ</span>
                        <div className="text-xs text-purple-600 font-medium">Cardiologie • Niveau 3</div>
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
                        <div className="p-3 bg-white/80 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-md">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                            <div className="h-2 bg-gray-300 rounded w-4/5"></div>
                          </div>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-purple-100 to-purple-50 rounded-xl border-2 border-purple-400 shadow-md transform scale-105">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                            <div className="h-2 bg-purple-400 rounded w-3/5"></div>
                          </div>
                        </div>
                        <div className="p-3 bg-white/80 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-md">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                            <div className="h-2 bg-gray-300 rounded w-5/6"></div>
                          </div>
                        </div>
                        <div className="p-3 bg-white/80 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-md">
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
                              <div className="w-7 h-1.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
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
                  <div className="h-full bg-gradient-to-b from-purple-100 via-blue-100 to-indigo-100 rounded-2xl p-2 flex flex-col relative overflow-hidden">
                    {/* Mobile header */}
                    <div className="w-full h-0.5 bg-gray-400 rounded-full mb-2"></div>
                    <div className="w-8 h-8 bg-purple-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="h-2 bg-purple-300 rounded w-full"></div>
                      <div className="h-1.5 bg-gray-300 rounded w-4/5"></div>
                      <div className="h-1.5 bg-gray-300 rounded w-3/5"></div>
                      
                      <div className="grid grid-cols-2 gap-1 mt-3">
                        <div className="h-6 bg-white rounded-md shadow-sm"></div>
                        <div className="h-6 bg-purple-200 rounded-md"></div>
                        <div className="h-6 bg-white rounded-md shadow-sm"></div>
                        <div className="h-6 bg-white rounded-md shadow-sm"></div>
                      </div>
                      
                      <div className="mt-3 pt-1.5 border-t border-gray-200">
                        <div className="h-0.5 bg-purple-400 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tablet Device - Smaller */}
                <div className="absolute -left-8 md:-left-12 top-20 md:top-24 w-32 h-20 md:w-36 md:h-24 bg-white rounded-2xl shadow-2xl p-3 transform rotate-12 hover:rotate-6 transition-all duration-500 border border-gray-100">
                  <div className="h-full bg-gradient-to-r from-purple-100 via-blue-100 to-indigo-100 rounded-xl p-2 flex items-center justify-center relative overflow-hidden">
                    {/* Tablet content */}
                    <div className="text-center w-full">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <Tablet className="w-4 h-4 text-white" />
                      </div>
                      <div className="space-y-1">
                        <div className="h-1.5 bg-purple-300 rounded w-16 mx-auto"></div>
                        <div className="h-1 bg-gray-300 rounded w-12 mx-auto"></div>
                        <div className="h-1 bg-gray-300 rounded w-10 mx-auto"></div>
                      </div>
                      
                      <div className="flex justify-center gap-1 mt-2">
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements for Extra Appeal */}
                <div className="absolute top-8 left-8 w-4 h-4 bg-purple-400 rounded-full animate-ping opacity-75"></div>
                <div className="absolute bottom-16 right-16 w-6 h-6 bg-blue-400 rounded-full animate-bounce opacity-60" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-32 -left-4 w-3 h-3 bg-indigo-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Characteristics Section */}
      <section id="caracteristiques" className="content-section py-14 md:py-20 bg-white" style={{ margin: 0 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Nos Caractéristiques
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Une plateforme conçue spécialement pour les étudiants en médecine, 
              avec des fonctionnalités avancées pour maximiser votre réussite.
            </p>
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
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Fonctionnalités Avancées
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Découvrez tous les outils dont vous avez besoin pour exceller 
              dans vos études médicales et préparer votre future carrière.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 mb-20">
             {features.map((feature, index) => (
               <div key={index} className="flex gap-6 group">
                 <div className="flex-shrink-0">
                   <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                     {feature.icon}
                   </div>
                 </div>
                 <div className="flex-1">
                   <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                   <p className="text-gray-600 leading-relaxed">{feature.description}</p>
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
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Témoignages d'Étudiants
            </h2>
            <p className="text-lg md:text-xl text-gray-600">
              Découvrez ce que disent nos utilisateurs de MedQ
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
             {testimonials.map((testimonial, index) => (
               <Card key={index} className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                 <CardHeader>
                   <div className="flex items-center gap-4">
                     <div className="text-4xl">{testimonial.avatar}</div>
                     <div>
                       <CardTitle className="text-lg text-gray-900">{testimonial.name}</CardTitle>
                       <CardDescription className="text-purple-600">{testimonial.role}</CardDescription>
                     </div>
                   </div>
                 </CardHeader>
                 <CardContent>
                   <Quote className="w-8 h-8 text-purple-400 mb-4" />
                   <p className="text-gray-600 italic leading-relaxed">"{testimonial.content}"</p>
                   <div className="flex gap-1 mt-4">
                     {[...Array(testimonial.rating)].map((_, i) => (
                       <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                     ))}
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
       </section>

       {/* Pricing Section */}
       <section id="tarifs" className="content-section py-14 md:py-20 bg-white" style={{ margin: 0 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Plans d'Abonnement
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Choisissez le plan qui correspond à votre niveau d'étude et à vos objectifs académiques.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
             {pricingPlans.map((plan, index) => (
               <Card key={index} className={`relative bg-white border border-gray-200 ${plan.popular ? 'ring-2 ring-purple-500 shadow-xl' : 'shadow-lg'} hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
                 {plan.popular && (
                   <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500">
                     Populaire
                   </Badge>
                 )}
                 <CardHeader className="text-center bg-white">
                   <CardTitle className="text-lg font-bold text-gray-900">{plan.name}</CardTitle>
                   <div className="text-3xl font-bold text-purple-600 mt-4">
                     {plan.price} <span className="text-sm text-gray-500">TND</span>
                   </div>
                   <CardDescription className="text-gray-600">{plan.duration}</CardDescription>
                 </CardHeader>
                 <CardContent className="bg-white">
                   <ul className="space-y-3">
                     {plan.features.map((feature, featureIndex) => (
                       <li key={featureIndex} className="flex items-center gap-3">
                         <CheckCircle className="w-4 h-4 text-green-500" />
                         <span className="text-sm text-gray-600">{feature}</span>
                       </li>
                     ))}
                   </ul>
                   <Button 
                     className={`w-full mt-6 ${plan.popular ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white transform hover:scale-105 transition-all duration-200`}
                     onClick={() => router.push('/auth')}
                   >
                     Choisir ce plan
                   </Button>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
       </section>

       {/* FAQ Section */}
       <section id="faq" className="content-section py-14 md:py-20 bg-white" style={{ margin: 0 }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Questions Fréquentes
            </h2>
            <p className="text-lg md:text-xl text-gray-600">
              Trouvez rapidement les réponses à vos questions
            </p>
          </div>
          <div className="space-y-4">
             {faqItems.map((item, index) => (
               <Card key={index} className="border border-gray-200 shadow-sm bg-white hover:shadow-md transition-all duration-200">
                 <button
                   onClick={() => toggleFAQ(index)}
                   className="w-full text-left p-6 flex items-center justify-between hover:bg-purple-50 transition-colors"
                 >
                   <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                   <ChevronDown
                     className={`w-5 h-5 text-purple-500 transition-transform duration-200 ${
                       openFAQ === index ? 'rotate-180' : ''
                     }`}
                   />
                 </button>
                 {openFAQ === index && (
                   <div className="px-6 pb-6 border-t border-gray-100 bg-purple-50">
                     <p className="text-gray-600 leading-relaxed pt-4">{item.answer}</p>
                   </div>
                 )}
               </Card>
             ))}
           </div>
         </div>
       </section>

       {/* CTA Section */}
       <section className="py-16 md:py-20 bg-gradient-to-br from-purple-600 to-blue-800">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
           <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
             Prêt à Exceller en Médecine ?
           </h2>
           <p className="text-lg md:text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
             Rejoignez des milliers d'étudiants qui ont déjà choisi MedQ pour réussir leurs examens médicaux.
           </p>
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Button 
               size="lg"
               onClick={() => router.push('/auth')}
               className="bg-white text-purple-600 hover:bg-purple-50 font-semibold text-lg px-8 py-4 shadow-lg transform hover:scale-105 transition-all duration-200"
             >
               Commencer maintenant
               <ArrowRight className="ml-2 w-5 h-5" />
             </Button>
             <Button 
               size="lg"
               variant="outline"
               className="border-white text-purple-600 hover:bg-white hover:text-purple-600 font-semibold text-lg px-8 py-4 shadow-lg transform hover:scale-105 transition-all duration-200"
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
               <h3 className="text-2xl font-bold mb-4 text-purple-300">MedQ</h3>
               <p className="text-gray-300 leading-relaxed">
                 La plateforme d'apprentissage médical de référence pour les étudiants ambitieux.
               </p>
             </div>
             <div>
               <h4 className="font-semibold mb-4 text-white">Plateforme</h4>
               <ul className="space-y-2 text-gray-300">
                 <li><a href="#" className="hover:text-purple-300 transition-colors">Fonctionnalités</a></li>
                 <li><a href="#" className="hover:text-purple-300 transition-colors">Tarifs</a></li>
                 <li><a href="#" className="hover:text-purple-300 transition-colors">Support</a></li>
               </ul>
             </div>
             <div>
               <h4 className="font-semibold mb-4 text-white">Ressources</h4>
               <ul className="space-y-2 text-gray-300">
                 <li><a href="#" className="hover:text-purple-300 transition-colors">Guide d'utilisation</a></li>
                 <li><a href="#" className="hover:text-purple-300 transition-colors">FAQ</a></li>
                 <li><a href="#" className="hover:text-purple-300 transition-colors">Contact</a></li>
               </ul>
             </div>
             <div>
               <h4 className="font-semibold mb-4 text-white">Suivez-nous</h4>
               <div className="flex space-x-4">
                 <a href="#" className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors transform hover:scale-110 duration-200">
                   <Facebook className="w-5 h-5" />
                 </a>
                 <a href="#" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors transform hover:scale-110 duration-200">
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
               <a href="#" className="hover:text-purple-300 ml-2">Politique de confidentialité</a> | 
               <a href="#" className="hover:text-purple-300 ml-2">Conditions d'utilisation</a>
             </p>
           </div>
         </div>
       </footer>
     </div>
   );
 }