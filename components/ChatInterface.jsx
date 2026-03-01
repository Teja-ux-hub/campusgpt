'use client';
import React, { useState, useRef, useEffect } from 'react';

export default function ChatInterface({ 
    title, 
    description, 
    suggestions = [], 
    agentName,
    accentColor = "gold" // gold, blue, emerald, purple
}) {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Hello! I am ${agentName}. How can I assist you today?` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    
    const chatContainerRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Handle scroll visibility
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Show button if user is not at bottom (with 100px buffer)
            const isNotAtBottom = scrollHeight - scrollTop - clientHeight > 100;
            setShowScrollButton(isNotAtBottom);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (text = input) => {
        if (!text.trim()) return;

        const newMessages = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Determine API endpoint based on title/agentName
            let apiEndpoint = '/api/chat/faculty'; // Default
            if (title.includes('Library')) apiEndpoint = '/api/chat/library';
            else if (title.includes('Placement')) apiEndpoint = '/api/chat/placement';
            else if (title.includes('Syllabus')) apiEndpoint = '/api/chat/documents';

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: data.response 
                }]);
            } else {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `Error: ${data.error || "Something went wrong."}` 
                }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "Network error. Please try again." 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const accentClasses = {
        gold: "text-gold-primary border-gold-primary/30 from-gold-primary/20 to-transparent",
        blue: "text-blue-400 border-blue-500/30 from-blue-500/20 to-transparent",
        emerald: "text-emerald-400 border-emerald-500/30 from-emerald-500/20 to-transparent",
        purple: "text-purple-400 border-purple-500/30 from-purple-500/20 to-transparent",
    };

    const accentColors = {
        gold: "var(--gold-primary)",
        blue: "#60A5FA",
        emerald: "#34D399",
        purple: "#A78BFA",
    };

    return (
        <div className="flex flex-col h-full relative overflow-hidden bg-bg-primary">
            {/* Header */}
            <div className="p-6 border-b border-border-subtle bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-10">
                <h1 className={`text-2xl font-serif font-bold tracking-tight ${accentClasses[accentColor].split(' ')[0]}`}>
                    {title}
                </h1>
                <p className="text-text-secondary text-sm mt-1">{description}</p>
            </div>

            {/* Chat Area */}
            <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 relative scroll-smooth"
            >
                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`
                            max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm
                            ${msg.role === 'user' 
                                ? 'bg-bg-tertiary border border-border-subtle text-text-primary rounded-br-sm' 
                                : `bg-gradient-to-br ${accentClasses[accentColor].split(' ').slice(2).join(' ')} border ${accentClasses[accentColor].split(' ')[1]} text-text-primary rounded-bl-sm`
                            }
                        `}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className={`
                            bg-bg-tertiary border border-border-subtle text-text-secondary rounded-2xl px-5 py-3.5 text-sm rounded-bl-sm animate-pulse
                        `}>
                            Processing query...
                        </div>
                    </div>
                )}
                
                {/* Empty State / Suggestions */}
                {messages.length === 1 && suggestions.length > 0 && (
                    <div className="mt-8">
                        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-4">Suggested Queries</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {suggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(suggestion)}
                                    className="text-left p-3 rounded-lg border border-border-subtle bg-bg-tertiary/50 hover:bg-bg-tertiary hover:border-gold-primary/30 transition-all duration-200 group"
                                >
                                    <span className="text-sm text-text-primary group-hover:text-gold-primary transition-colors">
                                        "{suggestion}"
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />

                {/* Scroll to Bottom Button */}
                <button
                    onClick={scrollToBottom}
                    className={`
                        fixed bottom-24 right-8 z-20
                        p-3 rounded-full shadow-lg border border-border-subtle
                        bg-bg-tertiary text-text-primary
                        hover:bg-bg-secondary hover:border-gold-primary/50 hover:text-gold-primary
                        transition-all duration-300 transform
                        ${showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
                    `}
                    aria-label="Scroll to bottom"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </button>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-bg-primary border-t border-border-subtle z-30">
                <div className="relative max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={`Ask ${agentName} anything...`}
                        className="w-full bg-bg-tertiary border border-border-subtle rounded-xl px-4 py-4 pr-12 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-primary/50 focus:ring-1 focus:ring-gold-primary/50 transition-all shadow-inner"
                    />
                    <button 
                        onClick={() => handleSend()}
                        className={`absolute right-2 top-2 p-2 rounded-lg hover:bg-white/10 transition-colors ${!input.trim() ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
                        disabled={!input.trim()}
                    >
                        <svg className="w-5 h-5" style={{ color: accentColors[accentColor] }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <p className="text-center text-[10px] text-text-muted mt-2">
                    CampusGPT Premium • AI can make mistakes. Verify important info.
                </p>
            </div>
        </div>
    );
}
