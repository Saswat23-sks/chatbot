import { ChatRule } from '../types';

export const CHAT_RULES: ChatRule[] = [
  {
    patterns: ['hello', 'hi', 'hey', 'greetings', 'yo'],
    responses: [
      'Hello! How can I help you today?',
      'Hi there! What\'s on your mind?',
      'Greetings! How are you doing?',
      'Yo! Ready to chat?',
      'Hey! I was just waiting for someone to talk to.'
    ]
  },
  {
    patterns: ['weather', 'temperature', 'rain', 'sunny', 'cloudy'],
    responses: [
      'I don\'t have real-time weather data, but it\'s always sunny in the digital world!',
      'You might want to check a weather app for that, but I hope it\'s nice outside!',
      'If I had a window, I\'d tell you. For now, let\'s assume it\'s perfect for chatting.'
    ]
  },
  {
    patterns: ['who are you', 'your name', 'what are you', 'identity'],
    responses: [
      'I am a simple rule-based chatbot with a bit of Gemini AI magic.',
      'I\'m your friendly neighborhood AI assistant.',
      'I\'m a collection of code and creativity, here to help you out.',
      'Call me SimpleBot, the hybrid assistant!'
    ]
  },
  {
    patterns: ['help', 'what can you do', 'commands', 'features'],
    responses: [
      'I can chat with you, answer simple questions, and use Gemini for more complex queries. Try asking me about the meaning of life or just say "hi"!',
      'I\'m a hybrid bot! I use fast rules for simple stuff and a powerful AI brain for the hard questions. What\'s on your mind?'
    ]
  },
  {
    patterns: ['joke', 'funny', 'laugh'],
    responses: [
      'Why did the web developer walk out of a restaurant? Because of the table layout.',
      'I told my computer I needed a break, and now it won\'t stop sending me KitKats.',
      'What do you call a fake noodle? An Impasta!'
    ]
  },
  {
    patterns: ['meaning of life', '42', 'universe'],
    responses: [
      '42, obviously. But I think it\'s actually about finding good conversation.',
      'The meaning of life is whatever you make of it. For me, it\'s processing your messages!',
      'To be, or not to be... that is the query.'
    ]
  },
  {
    patterns: ['bye', 'goodbye', 'see you', 'farewell'],
    responses: [
      'Goodbye! Have a great day!',
      'See you later!',
      'Bye! Come back soon!',
      'Farewell! I\'ll be here when you return.'
    ]
  },
  {
    patterns: ['thank', 'thanks', 'appreciate'],
    responses: [
      'You\'re welcome! Helping you makes my day.',
      'Anytime! I\'m always here for a good chat.',
      'Glad I could help! That\'s what friends are for.',
      'No problem at all! You\'re very welcome.'
    ]
  },
  {
    patterns: ['sad', 'bad day', 'unhappy', 'depressed', 'lonely'],
    responses: [
      'I\'m really sorry to hear that. I\'m just a bot, but I\'m here to listen. Want to talk about it?',
      'Sending you a virtual hug. Remember, even the darkest nights end with a sunrise.',
      'I wish I could do more than just chat, but I\'m here for you. You\'re not alone.'
    ]
  },
  {
    patterns: ['happy', 'great day', 'excited', 'awesome', 'good news'],
    responses: [
      'That\'s fantastic! Your energy is contagious!',
      'I\'m so happy for you! Tell me more, I love good news.',
      'Woohoo! Let\'s celebrate that win together!'
    ]
  },
  {
    patterns: ['bored', 'nothing to do', 'entertain me'],
    responses: [
      'Boredom is just the imagination taking a nap. Want me to tell you a story or give you a challenge?',
      'Let\'s fix that! I can tell you a joke, a weird fact, or we can play a quick word game. What do you say?',
      'I have a whole digital library of ideas. Should we explore something new?'
    ]
  }
];

export function processInput(input: string): string | null {
  const normalizedInput = input.toLowerCase().trim();
  
  // Simple tokenization (splitting by space and removing punctuation)
  const tokens = normalizedInput.replace(/[^\w\s]/g, '').split(/\s+/);

  for (const rule of CHAT_RULES) {
    for (const pattern of rule.patterns) {
      if (tokens.includes(pattern) || normalizedInput.includes(pattern)) {
        const randomIndex = Math.floor(Math.random() * rule.responses.length);
        return rule.responses[randomIndex];
      }
    }
  }

  return null;
}
