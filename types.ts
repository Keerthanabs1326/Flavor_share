
export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Review {
  id: string;
  userId: string;
  username: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface Substitution {
  original: string;
  replacement: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  substitutions?: Substitution[];
  instructions: string;
  authorId: string;
  authorName: string;
  imageUrl?: string;
  createdAt: number;
  cuisine?: string;
  dietary?: string[];
  cookingTime?: number; // in minutes
  reviews?: Review[];
}

export type ViewState = 'home' | 'login' | 'signup' | 'create' | 'favorites' | 'details';
