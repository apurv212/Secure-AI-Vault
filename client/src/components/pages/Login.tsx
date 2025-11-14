import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isRateLimitError } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Spinner } from '../ui/spinner';
import { Shield, Lock, CreditCard, Sparkles, Mail } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

export const Login: React.FC = () => {
  const { signIn, signInWithEmail, signUpWithEmail } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<AuthMode>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signIn();
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Check for rate limit error
      if (isRateLimitError(error)) {
        setError(error.message || 'Too many login attempts. Please try again after 15 minutes.');
      } else {
        setError(error.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (authMode === 'signup') {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      
      // Check for rate limit error first
      if (isRateLimitError(error)) {
        setError(error.message || 'Too many authentication attempts. Please try again after 15 minutes.');
      } else {
        // Provide user-friendly error messages for other errors
        let errorMessage = 'An error occurred. Please try again.';
        
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please use a stronger password.';
        } else if (error.code === 'auth/user-not-found') {
          errorMessage = 'No account found with this email. Please sign up first.';
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-credential') {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
    setError('');
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div className="min-h-screen w-full flex lg:items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 p-4 py-8 lg:py-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:items-center">
        {/* Left side - Branding and Features */}
        <div className="flex flex-col gap-6 lg:gap-8 text-slate-900 dark:text-slate-100 order-1 lg:order-none">
          <div className="space-y-3 lg:space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 lg:p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                <Shield className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Secure AI Vault
              </h1>
            </div>
            <p className="text-base lg:text-xl text-slate-600 dark:text-slate-400">
              Your intelligent card management solution
            </p>
          </div>

          <div className="space-y-4 lg:space-y-6">
            <div className="flex items-start gap-3 lg:gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                <Lock className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base lg:text-lg mb-1">Bank-Grade Security</h3>
                <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400">
                  Your cards are encrypted and stored with enterprise-level security
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 lg:gap-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex-shrink-0">
                <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base lg:text-lg mb-1">AI-Powered Organization</h3>
                <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400">
                  Automatically extract and organize card information with AI
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 lg:gap-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                <CreditCard className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base lg:text-lg mb-1">Smart Management</h3>
                <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400">
                  Search, filter, and manage all your cards in one secure place
                </p>
              </div>
            </div>

            {/* Powered by */}
            <div className="pt-4 lg:pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 text-center">
                Powered by{' '}
                <a
                  href="https://bnminfosolution.co.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  bnminfosolution.co.in
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <div className="flex items-center justify-center w-full order-2 lg:order-none">
          <Card className="w-full max-w-md shadow-2xl border-slate-200 dark:border-slate-800">
            <CardHeader className="space-y-3 text-center pb-6">
              <CardTitle className="text-2xl lg:text-3xl font-bold">
                {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-sm lg:text-base">
                {authMode === 'signin' 
                  ? 'Sign in to access your secure vault' 
                  : 'Sign up to start managing your cards securely'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email/Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (Optional)</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  {authMode === 'signup' && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Must be at least 6 characters long
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full text-base h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                >
                  {loading ? (
                    <>
                      <Spinner className="mr-2" />
                      {authMode === 'signin' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      {authMode === 'signin' ? 'Sign in with Email' : 'Sign up with Email'}
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-300 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google Sign In */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                size="lg"
                variant="outline"
                className="w-full text-base h-12"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>

              {/* Toggle between Sign In and Sign Up */}
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  disabled={loading}
                  className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authMode === 'signin' 
                    ? "Don't have an account? Sign up" 
                    : 'Already have an account? Sign in'}
                </button>
              </div>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                <p>
                  By signing in, you agree to our secure authentication process
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

