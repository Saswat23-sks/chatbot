import ChatInterface from './components/ChatInterface';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <ChatInterface />
        <Toaster position="top-center" richColors />
      </div>
    </ErrorBoundary>
  );
}
