
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Recipe, ViewState, Review } from './types';
import { RecipeCard } from './components/RecipeCard';
import { RecipeForm } from './components/RecipeForm';
import { Button } from './components/Button';
import { RatingStars } from './components/RatingStars';
import { ShareModal } from './components/ShareModal';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [view, setView] = useState<ViewState>('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Review State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Step-by-step State
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isGuidedMode, setIsGuidedMode] = useState(false);

  // Share State
  const [sharingRecipe, setSharingRecipe] = useState<Recipe | null>(null);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');

  useEffect(() => {
    const savedRecipes = localStorage.getItem('recipes');
    if (savedRecipes) setRecipes(JSON.parse(savedRecipes));

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      const savedFavorites = localStorage.getItem(`favorites_${parsedUser.id}`);
      if (savedFavorites) setFavoriteIds(JSON.parse(savedFavorites));
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favoriteIds));
    }
  }, [favoriteIds, user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    const userId = btoa(authEmail).substring(0, 10);
    const newUser: User = { id: userId, username: authEmail.split('@')[0], email: authEmail };
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    const savedFavorites = localStorage.getItem(`favorites_${newUser.id}`);
    setFavoriteIds(savedFavorites ? JSON.parse(savedFavorites) : []);
    setView('home');
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !authUsername) return;
    const userId = btoa(authEmail).substring(0, 10);
    const newUser: User = { id: userId, username: authUsername, email: authEmail };
    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    setFavoriteIds([]);
    setView('home');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    setFavoriteIds([]);
    setView('home');
  };

  const handleAddRecipe = (recipeData: any) => {
    if (!user) return;
    const newRecipe: Recipe = {
      ...recipeData,
      id: Math.random().toString(36).substr(2, 9),
      authorId: user.id,
      authorName: user.username,
      createdAt: Date.now(),
      reviews: []
    };
    setRecipes([newRecipe, ...recipes]);
    setView('home');
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRecipe || !reviewComment.trim()) return;

    const newReview: Review = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      username: user.username,
      rating: reviewRating,
      comment: reviewComment,
      createdAt: Date.now()
    };

    const updatedRecipes = recipes.map(r => {
      if (r.id === selectedRecipe.id) {
        return {
          ...r,
          reviews: [newReview, ...(r.reviews || [])]
        };
      }
      return r;
    });

    setRecipes(updatedRecipes);
    setSelectedRecipe(updatedRecipes.find(r => r.id === selectedRecipe.id) || null);
    setReviewComment('');
    setReviewRating(5);
  };

  const toggleFavorite = (id: string) => {
    if (!user) {
      setView('login');
      return;
    }
    setFavoriteIds(prev => 
      prev.includes(id) ? prev.filter(favId => favId !== id) : [...prev, id]
    );
  };

  const handleViewDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setActiveStepIndex(0);
    setIsGuidedMode(false);
    setView('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = (recipe: Recipe) => {
    setSharingRecipe(recipe);
  };

  const getAverageRating = (recipe: Recipe) => {
    if (!recipe.reviews || recipe.reviews.length === 0) return 0;
    const sum = recipe.reviews.reduce((acc, rev) => acc + rev.rating, 0);
    return sum / recipe.reviews.length;
  };

  const displayRecipes = useMemo(() => {
    let source = view === 'favorites' ? recipes.filter(r => favoriteIds.includes(r.id)) : recipes;
    return source.sort((a, b) => {
      const rateA = getAverageRating(a);
      const rateB = getAverageRating(b);
      if (rateA !== rateB) return rateB - rateA;
      return b.createdAt - a.createdAt;
    });
  }, [recipes, favoriteIds, view]);

  const parsedInstructions = useMemo(() => {
    if (!selectedRecipe) return [];
    return selectedRecipe.instructions
      .split(/\n+/)
      .map(step => step.replace(/^\d+[\.\)]\s*/, '').replace(/^Step\s+\d+:\s*/i, '').trim())
      .filter(step => step.length > 0);
  }, [selectedRecipe]);

  const renderRecipeList = (recipeList: Recipe[], title: string, subtitle: string) => (
    <div className="space-y-12 animate-in fade-in duration-700">
      <section className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold font-serif text-stone-900 dark:text-white mb-6 leading-tight tracking-tight">
          {title}
        </h1>
        <p className="text-stone-600 dark:text-stone-400 text-lg md:text-xl leading-relaxed">
          {subtitle}
        </p>
      </section>

      <div id="recipe-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 scroll-mt-24">
        {recipeList.length > 0 ? (
          recipeList.map(recipe => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              isFavorite={favoriteIds.includes(recipe.id)}
              onToggleFavorite={toggleFavorite}
              onViewDetails={handleViewDetails}
              onShare={handleShare}
            />
          ))
        ) : (
          <div className="col-span-full py-24 text-center bg-white dark:bg-stone-900/50 rounded-3xl border border-dashed border-stone-200 dark:border-stone-800">
            <div className="mb-6 text-stone-200 dark:text-stone-800 flex justify-center">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-200">No recipes yet</h3>
            <p className="text-stone-500 dark:text-stone-400 mt-2 max-w-sm mx-auto">Be the first to share a culinary masterpiece with the community!</p>
            {user && (
              <Button variant="primary" className="mt-8 px-8" onClick={() => setView('create')}>
                Create First Recipe
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 selection:bg-orange-500/30 transition-colors duration-300">
      {sharingRecipe && <ShareModal recipe={sharingRecipe} onClose={() => setSharingRecipe(null)} />}
      
      <nav className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-b border-stone-200 dark:border-stone-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center cursor-pointer group" onClick={() => setView('home')}>
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center mr-3 shadow-xl shadow-orange-900/20 group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-2xl">F</span>
              </div>
              <span className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tighter group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">FlavorShare</span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-5">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-orange-600 dark:hover:text-orange-400 transition-all hover:scale-105"
                aria-label="Toggle Theme"
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>

              {user ? (
                <>
                  <button onClick={() => setView('favorites')} className={`text-sm font-bold transition-all flex items-center gap-2 ${view === 'favorites' ? 'text-orange-600 dark:text-orange-400' : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'}`}>
                    <svg className="w-5 h-5" fill={view === 'favorites' ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    <span className="hidden sm:inline">Favorites</span>
                  </button>
                  <Button variant="primary" onClick={() => setView('create')} className="hidden sm:flex">Post Recipe</Button>
                  <Button variant="ghost" className="text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200" onClick={handleLogout}>Logout</Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setView('login')}>Login</Button>
                  <Button variant="primary" onClick={() => setView('signup')}>Join</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
        {view === 'home' && renderRecipeList(displayRecipes, 'Kitchen Community', 'Discover hand-crafted recipes or share your secret ingredients with the world.')}

        {view === 'favorites' && renderRecipeList(displayRecipes, 'My Favorites', 'A collection of your most loved culinary inspirations.')}

        {view === 'details' && selectedRecipe && (
          <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-700">
            <button 
              onClick={() => setView('home')}
              className="mb-8 flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-bold group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Recipes
            </button>
            
            <div className="bg-white dark:bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-100 dark:border-stone-800">
              <img 
                src={selectedRecipe.imageUrl || `https://picsum.photos/seed/${selectedRecipe.id}/1200/600`} 
                alt={selectedRecipe.title}
                className="w-full h-80 object-cover"
              />
              <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                  <div className="flex-1">
                    <h2 className="text-4xl md:text-5xl font-bold font-serif text-stone-900 dark:text-stone-50 mb-4">{selectedRecipe.title}</h2>
                    <div className="flex items-center flex-wrap gap-3 mb-4">
                      <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full border border-stone-200 dark:border-stone-700">
                        <RatingStars rating={getAverageRating(selectedRecipe)} size="sm" />
                        <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400">
                          {getAverageRating(selectedRecipe).toFixed(1)} ({selectedRecipe.reviews?.length || 0})
                        </span>
                      </div>
                      {selectedRecipe.cuisine && (
                        <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 dark:border-orange-800/30">
                          {selectedRecipe.cuisine}
                        </span>
                      )}
                      {selectedRecipe.cookingTime && (
                        <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {selectedRecipe.cookingTime} Minutes
                        </span>
                      )}
                      {selectedRecipe.dietary?.map(tag => (
                        <span key={tag} className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-3 py-1 rounded-full text-xs font-medium border border-stone-200 dark:border-stone-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-stone-500 dark:text-stone-400">
                      <span className="bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full text-sm font-medium">By {selectedRecipe.authorName}</span>
                      <span className="text-sm">• Published {new Date(selectedRecipe.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                      variant="outline"
                      onClick={() => handleShare(selectedRecipe)}
                      className="flex-1 md:flex-none"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Share
                    </Button>
                    <Button 
                      variant={favoriteIds.includes(selectedRecipe.id) ? "primary" : "outline"}
                      onClick={() => toggleFavorite(selectedRecipe.id)}
                      className="flex-1 md:flex-none"
                    >
                      {favoriteIds.includes(selectedRecipe.id) ? "Saved" : "Save Recipe"}
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-12 mb-16">
                  <div className="md:col-span-1 space-y-10">
                    <div>
                      <h4 className="text-xl font-bold font-serif mb-6 text-stone-900 dark:text-stone-50 border-b border-stone-100 dark:border-stone-800 pb-2">Ingredients</h4>
                      <ul className="space-y-4">
                        {selectedRecipe.ingredients.map((ing, i) => (
                          <li key={i} className="flex items-start gap-3 text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {selectedRecipe.substitutions && selectedRecipe.substitutions.length > 0 && (
                      <div className="bg-stone-50 dark:bg-stone-800/40 p-6 rounded-2xl border border-stone-100 dark:border-stone-800/50">
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-50 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                          Ingredient Swaps
                        </h4>
                        <div className="space-y-4">
                          {selectedRecipe.substitutions.map((sub, idx) => (
                            <div key={idx} className="group">
                              <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Missing {sub.original}?</p>
                              <p className="text-sm text-stone-700 dark:text-stone-300 font-medium">Use <span className="text-orange-600 dark:text-orange-400">{sub.replacement}</span> instead.</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-6 border-b border-stone-100 dark:border-stone-800 pb-2">
                        <h4 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-50">Instructions</h4>
                        <button 
                            onClick={() => {setIsGuidedMode(!isGuidedMode); setActiveStepIndex(0);}}
                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/30 flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {isGuidedMode ? 'Show All Steps' : 'Guided Cooking'}
                        </button>
                    </div>

                    {!isGuidedMode ? (
                        <div className="space-y-6">
                            {parsedInstructions.map((step, idx) => (
                                <div key={idx} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center shrink-0 text-xs font-bold text-stone-400 group-hover:bg-orange-600 group-hover:text-white transition-all">
                                            {idx + 1}
                                        </div>
                                        {idx !== parsedInstructions.length - 1 && (
                                            <div className="w-px flex-1 bg-stone-100 dark:bg-stone-800 my-2" />
                                        )}
                                    </div>
                                    <div className="pb-6">
                                        <p className="text-stone-600 dark:text-stone-400 text-sm leading-loose group-hover:text-stone-900 dark:group-hover:text-stone-200 transition-colors">
                                            {step}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-stone-50 dark:bg-stone-800/40 p-8 rounded-3xl border border-stone-200 dark:border-stone-700/50 shadow-inner relative overflow-hidden animate-in zoom-in-95 duration-500">
                             <div className="absolute top-0 left-0 h-1 bg-orange-600 transition-all duration-500" style={{ width: `${((activeStepIndex + 1) / parsedInstructions.length) * 100}%` }} />
                             
                             <div className="flex items-center justify-between mb-8">
                                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Step {activeStepIndex + 1} of {parsedInstructions.length}</span>
                                <div className="flex gap-1">
                                    {parsedInstructions.map((_, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= activeStepIndex ? 'bg-orange-500' : 'bg-stone-200 dark:bg-stone-700'}`} />
                                    ))}
                                </div>
                             </div>

                             <div className="min-h-[160px] flex items-center">
                                <p className="text-xl md:text-2xl font-medium text-stone-800 dark:text-stone-100 leading-relaxed animate-in slide-in-from-right-4 duration-300">
                                    {parsedInstructions[activeStepIndex]}
                                </p>
                             </div>

                             <div className="flex gap-4 mt-12">
                                <Button 
                                    variant="outline" 
                                    disabled={activeStepIndex === 0}
                                    onClick={() => setActiveStepIndex(Math.max(0, activeStepIndex - 1))}
                                    className="flex-1 py-3"
                                >
                                    Previous
                                </Button>
                                <Button 
                                    variant="primary" 
                                    onClick={() => activeStepIndex < parsedInstructions.length - 1 ? setActiveStepIndex(activeStepIndex + 1) : setIsGuidedMode(false)}
                                    className="flex-[2] py-3"
                                >
                                    {activeStepIndex < parsedInstructions.length - 1 ? 'Next Step' : 'Finish Cooking'}
                                </Button>
                             </div>
                        </div>
                    )}
                  </div>
                </div>

                <div className="pt-12 border-t border-stone-100 dark:border-stone-800">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-50">Community Reviews</h4>
                    {!user && (
                      <button onClick={() => setView('login')} className="text-orange-600 dark:text-orange-400 text-sm font-bold hover:underline">
                        Log in to leave a review
                      </button>
                    )}
                  </div>

                  {user && (
                    <form onSubmit={handleAddReview} className="mb-12 bg-stone-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-stone-200 dark:border-stone-700/50">
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Your Rating</label>
                        <RatingStars 
                          rating={reviewRating} 
                          interactive 
                          onRatingChange={setReviewRating} 
                          size="lg"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Comment</label>
                        <textarea
                          required
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="What did you think of this recipe? Did you make any changes?"
                          rows={3}
                          className="w-full p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-stone-900 dark:text-white transition-all text-sm"
                        />
                      </div>
                      <Button type="submit" className="w-full md:w-auto px-8">Post Review</Button>
                    </form>
                  )}

                  <div className="space-y-8">
                    {selectedRecipe.reviews && selectedRecipe.reviews.length > 0 ? (
                      selectedRecipe.reviews.map(review => (
                        <div key={review.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 border border-orange-200 dark:border-orange-800/30">
                            <span className="text-orange-700 dark:text-orange-400 font-bold text-sm">
                              {review.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-bold text-stone-900 dark:text-stone-50 text-sm">{review.username}</h5>
                              <span className="text-[10px] text-stone-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                            <RatingStars rating={review.rating} size="sm" />
                            <p className="mt-2 text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
                              {review.comment}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-stone-500 dark:text-stone-400 italic">No reviews yet. Be the first to share your experience!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'create' && user && <RecipeForm onSubmit={handleAddRecipe} onCancel={() => setView('home')} />}

        {(view === 'login' || view === 'signup') && (
          <div className="max-w-md mx-auto bg-white dark:bg-stone-900 p-10 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800">
            <h2 className="text-3xl font-bold font-serif mb-8 text-stone-900 dark:text-stone-50 text-center">
              {view === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <form onSubmit={view === 'login' ? handleLogin : handleSignup} className="space-y-5">
              {view === 'signup' && (
                <div>
                  <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Username</label>
                  <input type="text" required value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} className="w-full p-4 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-stone-900 dark:text-white transition-all" placeholder="ChefGordon" />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Email Address</label>
                <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full p-4 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-stone-900 dark:text-white transition-all" placeholder="name@example.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Password</label>
                <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full p-4 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-stone-900 dark:text-white transition-all" placeholder="••••••••" />
              </div>
              <Button type="submit" className="w-full py-4 mt-6 text-lg font-bold shadow-2xl shadow-orange-900/20">
                {view === 'login' ? 'Login' : 'Sign Up'}
              </Button>
              <div className="text-center mt-6 text-stone-500 dark:text-stone-400">
                {view === 'login' ? (
                  <p>No account? <button type="button" onClick={() => setView('signup')} className="text-orange-600 dark:text-orange-400 font-bold hover:underline">Sign up</button></p>
                ) : (
                  <p>Already have one? <button type="button" onClick={() => setView('login')} className="text-orange-600 dark:text-orange-400 font-bold hover:underline">Login</button></p>
                )}
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-900 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center items-center mb-8">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mr-2 shadow-lg shadow-orange-900/10">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-xl font-bold font-serif text-stone-900 dark:text-stone-50 tracking-tighter">FlavorShare</span>
          </div>
          <p className="text-stone-400 dark:text-stone-600 text-sm mb-8">Crafted for culinary explorers and digital creators.</p>
          <div className="flex justify-center space-x-10 text-stone-500 dark:text-stone-700 text-sm font-medium">
            <button onClick={() => setView('home')} className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">Home</button>
            <button className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">Privacy</button>
            <button className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">Terms</button>
            <button className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors">Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
