import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, ShoppingCart } from "lucide-react";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/slices/cartSlice";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { products as fallbackProducts } from "../data/Products";

// Knowledge base for common questions
const knowledgeBase = {
  delivery: {
    keywords: ["delivery", "deliver", "shipping", "ship", "when", "how long", "time"],
    response: "We offer 30-minute delivery for most items! Orders are processed immediately and delivered fresh to your doorstep. Delivery is available from 6 AM to 11 PM daily."
  },
  return: {
    keywords: ["return", "refund", "exchange", "replace", "damaged", "wrong"],
    response: "Not satisfied? No problem! Return any item within 24 hours of delivery for a full refund. For damaged or wrong items, we'll replace them immediately at no extra cost. Just contact our support team."
  },
  payment: {
    keywords: ["payment", "pay", "card", "upi", "cash", "cod"],
    response: "We accept all major payment methods: Credit/Debit Cards, UPI (GPay, PhonePe, Paytm), Net Banking, and Cash on Delivery. All transactions are secure and encrypted."
  },
  order: {
    keywords: ["order", "track", "status", "where", "my order"],
    response: "You can track your order in the 'Order History' section. Real-time tracking shows preparation, dispatch, and delivery status. You'll also receive SMS/WhatsApp updates at each step."
  },
  hours: {
    keywords: ["hour", "open", "close", "time", "24", "when"],
    response: "We're open daily from 6:00 AM to 11:00 PM. Orders placed after 11 PM will be processed the next morning. During festivals, we may extend hours!"
  },
  contact: {
    keywords: ["contact", "support", "help", "call", "email", "phone"],
    response: "Reach us at support@shopnest.com or call 1800-SHOPNEST (1800-74676378). Our support team is available 24/7 to assist you. You can also use the in-app chat for instant help."
  }
};

// Flatten all products for searching
const getAllProducts = () => {
  const allProducts = [];
  Object.entries(fallbackProducts).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      items.forEach(item => {
        allProducts.push({
          ...item,
          category,
          nameLower: item.name.toLowerCase(),
          categoryLower: category.toLowerCase()
        });
      });
    }
  });
  return allProducts;
};

// AI Response generator
const generateResponse = (query, products) => {
  const lowerQuery = query.toLowerCase().trim();
  
  // Check knowledge base first
  for (const [key, data] of Object.entries(knowledgeBase)) {
    if (data.keywords.some(keyword => lowerQuery.includes(keyword))) {
      return {
        type: "text",
        content: data.response
      };
    }
  }
  
  // Product search and recommendations
  if (lowerQuery.includes("suggest") || lowerQuery.includes("recommend") || 
      lowerQuery.includes("what should") || lowerQuery.includes("best")) {
    return generateRecommendation(lowerQuery, products);
  }
  
  // Budget-based search
  const budgetMatch = lowerQuery.match(/under\s+₹?(\d+)/) || lowerQuery.match(/below\s+₹?(\d+)/);
  if (budgetMatch) {
    const maxPrice = parseInt(budgetMatch[1]);
    const affordableProducts = products.filter(p => p.price <= maxPrice);
    if (affordableProducts.length > 0) {
      return {
        type: "products",
        content: `Here are items under ₹${maxPrice}:`,
        products: affordableProducts.slice(0, 4)
      };
    }
    return { type: "text", content: `Sorry, no items found under ₹${maxPrice}. Try a higher budget!` };
  }
  
  // Category search
  const categoryKeywords = ["fruits", "vegetables", "veggies", "dairy", "snacks", "grains", "spices"];
  for (const category of categoryKeywords) {
    if (lowerQuery.includes(category)) {
      const categoryProducts = products.filter(p => 
        p.categoryLower.includes(category) || 
        (category === "veggies" && p.categoryLower.includes("vegetable"))
      );
      if (categoryProducts.length > 0) {
        return {
          type: "products",
          content: `Here are our fresh ${category}:`,
          products: categoryProducts.slice(0, 4)
        };
      }
    }
  }
  
  // Specific product search
  const searchWords = lowerQuery.split(" ").filter(w => w.length > 2);
  const matchingProducts = products.filter(product => {
    return searchWords.some(word => 
      product.nameLower.includes(word) || product.categoryLower.includes(word)
    );
  });
  
  if (matchingProducts.length > 0) {
    return {
      type: "products",
      content: `I found ${matchingProducts.length} item(s) for you:`,
      products: matchingProducts.slice(0, 4)
    };
  }
  
  // Default responses
  const greetings = ["hi", "hello", "hey", "namaste", "good morning", "good evening"];
  if (greetings.some(g => lowerQuery.startsWith(g))) {
    return {
      type: "text",
      content: "Hello! 👋 I'm your Shopnest AI assistant. I can help you find products, suggest items based on your budget, or answer questions about orders and delivery. What would you like to know?"
    };
  }
  
  return {
    type: "text",
    content: "I'm here to help! I can:\n• Find products for you\n• Suggest items based on your budget\n• Answer questions about delivery, returns, and orders\n\nTry asking: 'Show me fruits under ₹100' or 'What's your return policy?'"
  };
};

const generateRecommendation = (query, products) => {
  // Budget-based recommendations
  const budgetMatch = query.match(/₹?(\d+)/);
  if (budgetMatch) {
    const budget = parseInt(budgetMatch[1]);
    const affordable = products.filter(p => p.price <= budget);
    if (affordable.length > 0) {
      const sorted = affordable.sort((a, b) => a.price - b.price).slice(0, 4);
      return {
        type: "products",
        content: `Great options within ₹${budget}:`,
        products: sorted
      };
    }
  }
  
  // Category-specific recommendations
  if (query.includes("fruit")) {
    const fruits = products.filter(p => p.categoryLower === "fruits");
    return {
      type: "products",
      content: "Our best-selling fruits:",
      products: fruits.slice(0, 4)
    };
  }
  
  if (query.includes("vegetable") || query.includes("veggie")) {
    const veggies = products.filter(p => p.categoryLower === "vegetables");
    return {
      type: "products",
      content: "Fresh vegetables we recommend:",
      products: veggies.slice(0, 4)
    };
  }
  
  // General best picks
  const bestPicks = products
    .sort((a, b) => a.price - b.price)
    .slice(0, 4);
  
  return {
    type: "products",
    content: "Here are some great value picks:",
    products: bestPicks
  };
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      content: "Hello! 👋 I'm your Shopnest AI assistant. How can I help you today?\n\nI can:\n• Find products for you\n• Suggest items based on your budget\n• Answer questions about delivery, returns, and orders"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const allProducts = getAllProducts();
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);
    
    // Simulate AI response delay
    setTimeout(() => {
      const response = generateResponse(inputValue, allProducts);
      const botMessage = {
        id: Date.now() + 1,
        type: "bot",
        ...response
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 800);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleAddToCart = (product) => {
    if (!user) {
      toast.error("Please login to add items to cart");
      return;
    }
    dispatch(addToCart(product));
    toast.success(`Added ${product.name} to cart`);
  };
  
  const quickActions = [
    "Show fruits under ₹100",
    "What's your return policy?",
    "How fast is delivery?",
    "Recommend vegetables"
  ];
  
  return (
    <>
      {/* AI Assistant Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
        aria-label="AI Assistant"
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <>
            <Sparkles size={20} />
            <span className="hidden sm:inline font-semibold">AI Help</span>
          </>
        )}
      </button>
      
      {/* AI Assistant Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-96 max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl z-50 flex flex-col border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-t-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">Shopnest AI</h3>
              <p className="text-xs text-white/80">Your shopping assistant</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] ${
                    message.type === "user"
                      ? "bg-emerald-500 text-white rounded-2xl rounded-tr-md"
                      : "bg-white text-slate-800 rounded-2xl rounded-tl-md shadow-sm border border-slate-100"
                  } p-3`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  
                  {/* Product recommendations */}
                  {message.type === "products" && message.products && (
                    <div className="mt-3 space-y-2">
                      {message.products.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded object-cover"
                            onError={(e) => {
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23f1f5f9' width='40' height='40'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='%2394a3b8' font-size='10'%3ENo Img%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{product.name}</p>
                            <p className="text-xs text-emerald-600 font-semibold">₹{product.price}</p>
                          </div>
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="bg-emerald-500 text-white p-1.5 rounded-full hover:bg-emerald-600 transition shrink-0"
                            title="Add to cart"
                          >
                            <ShoppingCart size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-md shadow-sm border border-slate-100 p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Quick Actions */}
          <div className="px-4 py-2 bg-white border-t border-slate-100">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(action)}
                  className="whitespace-nowrap px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-full transition shrink-0"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
          
          {/* Input */}
          <div className="flex items-center gap-2 p-3 bg-white border-t border-slate-100 rounded-b-2xl">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-emerald-500 text-white p-2.5 rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}