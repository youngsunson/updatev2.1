import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

/* -------------------------------------------------------------------------- */
/*                                TYPES                                       */
/* -------------------------------------------------------------------------- */

type DocType = 'generic' | 'academic' | 'official' | 'marketing' | 'social';

interface Correction {
  wrong: string;
  suggestions: string[];
  position?: number; 
}

interface ToneSuggestion {
  current: string;
  suggestion: string;
  reason: string;
  position?: number;
}

interface StyleSuggestion {
  current: string;
  suggestion: string;
  type: string;
  position?: number;
}

interface StyleMixingCorrection {
  current: string;
  suggestion: string;
  type: string;
  position?: number;
}

interface StyleMixing {
  detected: boolean;
  recommendedStyle?: string;
  reason?: string;
  corrections?: StyleMixingCorrection[];
}

interface PunctuationIssue {
  issue: string;
  currentSentence: string;
  correctedSentence: string;
  explanation: string;
  position?: number;
}

interface EuphonyImprovement {
  current: string;
  suggestions: string[];
  reason: string;
  position?: number;
}

interface ContentAnalysis {
  contentType: string;
  description?: string;
  missingElements?: string[];
  suggestions?: string[];
}

/* -------------------------------------------------------------------------- */
/*                       DOC TYPE CONFIG & HELPERS                            */
/* -------------------------------------------------------------------------- */

const DOC_TYPE_CONFIG: Record<
  DocType,
  { 
    label: string; 
    description: string; 
    defaultTone: string; 
    mainHint: string;
    contentHint: string;
  }
> = {
  generic: {
    label: 'সাধারণ লেখা',
    description: 'যেকোনো সাধারণ লেখা – নিরপেক্ষভাবে বিশ্লেষণ করবে।',
    defaultTone: '',
    mainHint: 'এটি একটি সাধারণ বাংলা লেখা হিসেবে বিবেচনা করুন।',
    contentHint: 'সাধারণ লেখার ক্ষেত্রে মূল বক্তব্য পরিষ্কার আছে কি না এবং গঠনগত যৌক্তিকতা আছে কি না দেখুন।'
  },
  academic: {
    label: 'একাডেমিক লেখা',
    description: 'গবেষণা পত্র, প্রবন্ধ, থিসিস ইত্যাদি।',
    defaultTone: 'academic',
    mainHint: 'এটি একাডেমিক/গবেষণামূলক লেখা হিসেবে বিবেচনা করুন। ভাষার শুদ্ধতা, টার্মিনোলজি এবং আনুষ্ঠানিকতা বেশি গুরুত্ব দিন।',
    contentHint: 'একাডেমিক লেখার ক্ষেত্রে ভূমিকা, যুক্তি, উদাহরণ ও উপসংহার আছে কি না এবং রেফারেন্স/উৎস উল্লেখ আছে কি না লক্ষ্য করুন।'
  },
  official: {
    label: 'অফিশিয়াল চিঠি',
    description: 'দাপ্তরিক আবেদন, নোটিশ, অফিসিয়াল ইমেইল ইত্যাদি।',
    defaultTone: 'formal',
    mainHint: 'এটি একটি অফিসিয়াল/দাপ্তরিক লেখা হিসেবে বিবেচনা করুন। ভদ্রতা, সম্মানসূচক সম্বোধন ও স্পষ্টতা গুরুত্ব দিন।',
    contentHint: 'অফিশিয়াল লেখায় প্রাপক, বিষয়, উদ্দেশ্য, প্রয়োজনীয় তথ্য ও বিনীত উপসংহার আছে কি না দেখুন।'
  },
  marketing: {
    label: 'মার্কেটিং কপি',
    description: 'বিজ্ঞাপন, সেলস পেজ, প্রমোশনাল লেখা ইত্যাদি।',
    defaultTone: 'persuasive',
    mainHint: 'এটি একটি মার্কেটিং/প্রমোশনাল লেখা হিসাবে ধরুন। প্রভাবশালী, আকর্ষণীয় ও স্পষ্ট বার্তার ওপর গুরুত্ব দিন।',
    contentHint: 'মার্কেটিং কনটেন্টে প্রস্তাবিত পণ্য/সেবা, এর উপকারিতা, স্পষ্ট কল-টু-অ্যাকশন (CTA) এবং লক্ষ্যমাত্রা পাঠকের জন্য উপযোগী ভাষা আছে কি না দেখুন।'
  },
  social: {
    label: 'সোশ্যাল মিডিয়া পোস্ট',
    description: 'ফেসবুক, ইনস্টাগ্রাম, টুইটার ইত্যাদির লেখা।',
    defaultTone: 'informal',
    mainHint: 'এটি একটি সোশ্যাল মিডিয়া পোস্ট হিসেবে বিবেচনা করুন। স্বাভাবিক, বন্ধুত্বপূর্ণ ও আকর্ষণীয় ভাষা গুরুত্ব দিন।',
    contentHint: 'সোশ্যাল মিডিয়া পোস্টে পরিষ্কার বার্তা, উপযুক্ত টোন, ইঙ্গেজমেন্ট বাড়ানোর উপাদান (প্রশ্ন, CTA, হ্যাশট্যাগ ইত্যাদি) আছে কি না দেখুন।'
  }
};

const getDocTypeLabel = (t: DocType) => DOC_TYPE_CONFIG[t].label;

/* -------------------------------------------------------------------------- */
/*                        PROMPT BUILDERS                                     */
/* -------------------------------------------------------------------------- */

const buildTonePrompt = (text: string, tone: string) => {
  const toneInstructions: Record<string, string> = {
    'formal': `আপনি একজন বাংলা ভাষা বিশেষজ্ঞ। নিচের টেক্সটকে **আনুষ্ঠানিক (Formal)** টোনে রূপান্তরের জন্য বিশ্লেষণ করুন। বৈশিষ্ট্য: আপনি/আপনার ব্যবহার, ক্রিয়াপদে 'করুন/বলুন', পূর্ণ বাক্য গঠন।`,
    'informal': `আপনি একজন বাংলা ভাষা বিশেষজ্ঞ। নিচের টেক্সটকে **অনানুষ্ঠানিক (Informal)** টোনে রূপান্তরের জন্য বিশ্লেষণ করুন। বৈশিষ্ট্য: তুমি/তুই ব্যবহার, কথ্য ভাষা, সহজ শব্দ।`,
    'professional': `আপনি একজন বাংলা ভাষা বিশেষজ্ঞ। নিচের টেক্সটকে **পেশাদার (Professional)** টোনে রূপান্তরের জন্য বিশ্লেষণ করুন। বৈশিষ্ট্য: স্পষ্টতা, আত্মবিশ্বাসী ভাষা, পেশাদার শব্দভাণ্ডার।`,
    'friendly': `আপনি একজন বাংলা ভাষা বিশেষজ্ঞ। নিচের টেক্সটকে **বন্ধুত্বপূর্ণ (Friendly)** টোনে রূপান্তরের জন্য বিশ্লেষণ করুন। বৈশিষ্ট্য: উষ্ণ সম্বোধন, আবেগপূর্ণ শব্দ, ইতিবাচক ভাষা।`,
    'respectful': `আপনি একজন বাংলা ভাষা বিশেষজ্ঞ। নিচের টেক্সটকে **সম্মানজনক (Respectful)** টোনে রূপান্তরের জন্য বিশ্লেষণ করুন। বৈশিষ্ট্য: সম্মানসূচক সম্বোধন, বিনীত অনুরোধ, শ্রদ্ধাসূচক শব্দ।`,
    'persuasive': `আপনি একজন বাংলা ভাষা বিশেষজ্ঞ। নিচের টেক্সটকে **প্রভাবশালী (Persuasive)** টোনে রূপান্তরের জন্য বিশ্লেষণ করুন। বৈশিষ্ট্য: শক্তিশালী শব্দ, জরুরিতা তৈরি, ইতিবাচক ফলাফল।`,
    'neutral': `আপনি একজন বাংলা ভাষা বিশেষজ্ঞ। নিচের টেক্সটকে **নিরপেক্ষ (Neutral)** টোনে রূপান্তরের জন্য বিশ্লেষণ করুন। বৈশিষ্ট্য: বস্তুনিষ্ঠ ভাষা, আবেগমুক্ত শব্দ, সূত্র উল্লেখ।`,
    'academic': `আপনি একজন বাংলা ভাষা বিশেষজ্ঞ। নিচের টেক্সটকে **শিক্ষামূলক (Academic)** টোনে রূপান্তরের জন্য বিশ্লেষণ করুন। বৈশিষ্ট্য: পরিভাষা ব্যবহার, তৃতীয় পুরুষ, জটিল বাক্য।`
  };

  return `${toneInstructions[tone]}

📝 **বিশ্লেষণের জন্য টেক্সট:**
"""${text}"""

📋 **আপনার কাজ:**
1. টেক্সটের প্রতিটি শব্দ ও বাক্যাংশ বিশ্লেষণ করুন।
2. কাঙ্ক্ষিত টোনে নেই এমন শব্দগুলো চিহ্নিত করুন।
3. "position" ফিল্ডে সেই শব্দের 0-based word index দিন; ইনপুট টেক্সটকে স্পেস/নতুন লাইনে ভাগ করে ধারাবাহিকভাবে গুনবেন।
4. **গুরুত্বপূর্ণ:** "current" ফিল্ডে শব্দটি হুবহু ইনপুট টেক্সট থেকে কপি করবেন (কোনো পরিবর্তন ছাড়া)।

📤 Response Format (ONLY valid JSON, no markdown, no extra text):
{
  "toneConversions": [
    {
      "current": "বর্তমান শব্দ (হুবহু টেক্সট থেকে)",
      "suggestion": "সংশোধিত রূপ",
      "reason": "কারণ",
      "position": 0
    }
  ]
}

যদি কোনো পরিবর্তন প্রয়োজন না হয়, তাহলে "toneConversions": [] খালি array রাখবেন।`;
};

const buildStylePrompt = (text: string, style: string) => {
  const styleInstructions: Record<string, string> = {
    'sadhu': `নিচের টেক্সটকে **সাধু রীতি**তে রূপান্তরের জন্য বিশ্লেষণ করুন। ক্রিয়াপদ (ছি->তেছি, ল->ইল), সর্বনাম (তার->তাহার) এবং অব্যয় পরিবর্তন করুন।`,
    'cholito': `নিচের টেক্সটকে **চলিত রীতি**তে রূপান্তরের জন্য বিশ্লেষণ করুন। ক্রিয়াপদ (তেছি->ছি, ইল->ল), সর্বনাম (তাহার->তার) এবং অব্যয় পরিবর্তন করুন।`
  };

  return `${styleInstructions[style]}

═══════════════════════════════════════
📝 বিশ্লেষণের জন্য টেক্সট:
"""${text}"""
═══════════════════════════════════════

⚠️ **সতর্কতা:**
- "current" ফিল্ডে শব্দটি টেক্সট থেকে **হুবহু কপি** করবেন।
- যদি কোন শব্দ পরিবর্তন প্রয়োজন না হয় তবে সেটি বাদ দিন।
- "position" ফিল্ডে সেই শব্দের 0-based word index দিন; ইনপুট টেক্সটকে স্পেস/নতুন লাইনে ভাগ করে ধারাবাহিকভাবে গুনবেন।

📤 Response Format (ONLY valid JSON, no markdown, no extra text):
{
  "styleConversions": [
    {
      "current": "বর্তমান শব্দ (হুবহু টেক্সট থেকে)",
      "suggestion": "সংশোধিত শব্দ",
      "type": "ক্রিয়াপদ/সর্বনাম/অব্যয়",
      "position": 0
    }
  ]
}

যদি কোনো পরিবর্তন প্রয়োজন না হয়, তাহলে "styleConversions": [] খালি array রাখবেন।`;
};

const buildMainPrompt = (text: string, docType: DocType) => {
  const docCfg = DOC_TYPE_CONFIG[docType];
  return `
আপনি একজন দক্ষ বাংলা প্রুফরিডার।

${docCfg.mainHint}

নিচের টেক্সটটি খুব মনোযোগ দিয়ে বিশ্লেষণ করুন:

"""${text}"""

⚠️ কড়া নির্দেশনা:

০. position / index
   - যেসব অবজেক্টে "position" ফিল্ড আছে, সেখানে:
   - "position" = এই টেক্সটের ভেতরে ঐ শব্দ/বাক্যাংশের প্রথম শব্দের 0-based word index।
   - word index নির্ণয়: টেক্সটকে স্পেস, নতুন লাইন ইত্যাদি দিয়ে ভাগ করে ধারাবাহিকভাবে গুনবেন।

১. বানান ভুল (spellingErrors)
   - শুধু একদম নিশ্চিত ভুল বানান ধরবেন (যেমন যুক্তাক্ষর, ণত্ব-ষত্ব, স্পষ্ট টাইপো)।
   - নাম, ব্র্যান্ড, টেকনিক্যাল টার্ম, ইংরেজি শব্দের বানান পরিবর্তন করবেন না।
   - "wrong" ফিল্ডে ইনপুটের শব্দটি হুবহু কপি করবেন।
   - "suggestions"–এ ১–৩টি বাস্তবসম্মত সঠিক বানান দিন।
   - "position"–এ ভুল শব্দের প্রথম শব্দের index দিন (অধিকাংশ ক্ষেত্রে এক শব্দই হবে)।

২. বিরাম চিহ্ন (punctuationIssues)
   - একমাত্র তখনই সমস্যা ধরবেন যখন:
     - পূর্ণাঙ্গ, লম্বা বাক্যের শেষে কোনো দাঁড়ি/প্রশ্নবোধক/বিস্ময়সূচক/ড্যাশ নেই।
   - শিরোনাম, তালিকা, কবিতায় দাঁড়ি না থাকলেও সেটিকে ভুল ধরবেন না।
   - "currentSentence" ফিল্ডে ইনপুট বাক্য হুবহু কপি করবেন।
   - "correctedSentence" শুধু যতিচিহ্ন/খুব সামান্য গঠন ঠিক করবে; পুরো বাক্য নতুন করে লিখবেন না।
   - "position"–এ ঐ বাক্যের প্রথম শব্দের index দিন।

৩. ভাষারীতি মিশ্রণ (languageStyleMixing)
   - সাধু ও চলিত রীতি একসাথে ব্যবহৃত হলে তবেই detected = true করুন।
   - খুব বেশি পরিবর্তন না করে, একই ধরণের শব্দে সামঞ্জস্য আনার সাজেশন দিবেন।
   - "current" ফিল্ডে ইনপুটের অংশ হুবহু কপি করবেন।
   - প্রতিটি correction অবজেক্টে "position" দিন।

৪. শ্রুতিমধুরতা (euphonyImprovements)
   - কেবল তখনই সাজেশন দেবেন যখন কোনো শব্দ/বাক্যাংশ সত্যিই কানে বিরক্তিকর বা অতিরিক্ত ভারী শোনায়।
   - অর্থের বড় পরিবর্তন করবেন না, শুধু সামান্য শব্দ বাছাই ভালো করবেন।
   - "position"–এ বাক্যাংশের প্রথম শব্দের index দিন।

📤 আউটপুট ফরম্যাট (ONLY valid JSON, কোনো markdown code block, ব্যাখ্যা বা অতিরিক্ত টেক্সট নয়):

{
  "spellingErrors": [
    {
      "wrong": "ভুল_শব্দ",
      "suggestions": ["সঠিক ১", "সঠিক ২"],
      "position": 0
    }
  ],
  "languageStyleMixing": {
    "detected": true,
    "recommendedStyle": "সাধু/চলিত",
    "reason": "সংক্ষিপ্ত কারণ",
    "corrections": [
      {
        "current": "শব্দ",
        "suggestion": "সংশোধন",
        "type": "সাধু→চলিত",
        "position": 10
      }
    ]
  },
  "punctuationIssues": [
    {
      "issue": "সমস্যা",
      "currentSentence": "ইনপুট বাক্য",
      "correctedSentence": "সংশোধিত বাক্য",
      "explanation": "ব্যাখ্যা",
      "position": 50
    }
  ],
  "euphonyImprovements": [
    {
      "current": "শব্দ/বাক্যাংশ",
      "suggestions": ["বিকল্প"],
      "reason": "কেন এটি ভালো",
      "position": 120
    }
  ]
}
`;
};

/* -------------------------------------------------------------------------- */
/*                           MAIN COMPONENT                                   */
/* -------------------------------------------------------------------------- */

type SectionKey =
  | 'spelling'
  | 'tone'
  | 'style'
  | 'mixing'
  | 'punctuation'
  | 'euphony'
  | 'content';

type ViewFilter = 'all' | 'spelling' | 'punctuation';

function App() {
  // Settings State
  // FIX: Default model set to gemini-2.5-flash as per user requirement
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('gemini_model') || 'gemini-2.5-flash');
  const [docType, setDocType] = useState<DocType>(
    (localStorage.getItem('doc_type') as DocType) || 'generic'
  );
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeModal, setActiveModal] = useState<
    'none' | 'settings' | 'instructions' | 'tone' | 'style' | 'doctype' | 'mainMenu'
  >('none');

  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    spelling: false,
    tone: false,
    style: false,
    mixing: false,
    punctuation: false,
    euphony: false,
    content: false
  });
  
  // Selection State
  const [selectedTone, setSelectedTone] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<'none' | 'sadhu' | 'cholito'>('none');

  // Data State
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [toneSuggestions, setToneSuggestions] = useState<ToneSuggestion[]>([]);
  const [styleSuggestions, setStyleSuggestions] = useState<StyleSuggestion[]>([]);
  const [languageStyleMixing, setLanguageStyleMixing] = useState<StyleMixing | null>(null);
  const [punctuationIssues, setPunctuationIssues] = useState<PunctuationIssue[]>([]);
  const [euphonyImprovements, setEuphonyImprovements] = useState<EuphonyImprovement[]>([]);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  
  const [stats, setStats] = useState({ totalWords: 0, errorCount: 0, accuracy: 100 });

  useEffect(() => {
    // Initialize logic if needed
  }, []);

  /* --- HELPERS --- */
  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Helper for Rate Limiting (Delay)
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const saveSettings = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_model', selectedModel);
    localStorage.setItem('doc_type', docType);
    showMessage('সেটিংস সংরক্ষিত হয়েছে! ✓', 'success');
    setActiveModal('none');
  };

  const toggleSection = (key: SectionKey) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const normalize = (str: string) => {
    if (!str) return '';
    return str.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  };

  // NOTE: Chunking function removed for main execution logic, but keeping helper if needed later.
  // We will now send full text.

  /* --- WORD API INTERACTION --- */
  const getTextFromWord = async (): Promise<string> => {
    return new Promise((resolve) => {
      Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load(['text', 'isEmpty']);
        await context.sync();

        let targetText = '';
        if (!selection.isEmpty && selection.text.trim().length > 0) {
          targetText = selection.text;
        } else {
          const body = context.document.body;
          body.load('text');
          await context.sync();
          targetText = body.text;
        }
        
        const cleanText = targetText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        resolve(cleanText);
      }).catch((error) => {
        console.error('Error reading Word:', error);
        resolve('');
      });
    });
  };

  const highlightInWord = async (text: string, color: string, position?: number) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    const hasSpace = /\s/.test(cleanText);

    await Word.run(async (context) => {
      const body = context.document.body;

      if (typeof position === 'number' && position >= 0 && !hasSpace) {
        const whole = body.getRange("Whole");
        const words = whole.getTextRanges([" ", "\r", "\n", "\t"], true);
        words.load("items");
        await context.sync();

        if (position < words.items.length) {
          const targetRange = words.items[position];
          targetRange.font.highlightColor = color;
          await context.sync();
          return;
        }
      }

      const results = body.search(cleanText, { 
        matchCase: false,
        matchWholeWord: !hasSpace,
        ignoreSpace: true 
      });
      results.load('font');
      await context.sync();
      
      for (let i = 0; i < results.items.length; i++) {
        results.items[i].font.highlightColor = color;
      }
      await context.sync();
    }).catch(console.error);
  };

  const replaceInWord = async (oldText: string, newText: string, position?: number) => {
    const cleanOldText = oldText.trim();
    if (!cleanOldText) return;
    
    const hasSpace = /\s/.test(cleanOldText);
    let success = false;

    await Word.run(async (context) => {
      const body = context.document.body;

      if (typeof position === 'number' && position >= 0 && !hasSpace) {
        const whole = body.getRange("Whole");
        const words = whole.getTextRanges([" ", "\r", "\n", "\t"], true);
        words.load("items");
        await context.sync();

        if (position < words.items.length) {
          const target = words.items[position];
          target.insertText(newText, Word.InsertLocation.replace);
          target.font.highlightColor = "None";
          await context.sync();
          success = true;
          return;
        }
      }

      const results = body.search(cleanOldText, { 
        matchCase: false,
        matchWholeWord: !hasSpace,
        ignoreSpace: true 
      });
      results.load('items');
      await context.sync();

      if (results.items.length > 0) {
        results.items.forEach((item) => {
          item.insertText(newText, Word.InsertLocation.replace);
          item.font.highlightColor = "None";
        });
        await context.sync();
        success = true;
      }
    }).catch(console.error);

    if (success) {
      const target = normalize(cleanOldText);
      const isNotMatch = (textToCheck: string) => normalize(textToCheck) !== target;

      setCorrections(prev => prev.filter(c => isNotMatch(c.wrong)));
      setToneSuggestions(prev => prev.filter(t => isNotMatch(t.current)));
      setStyleSuggestions(prev => prev.filter(s => isNotMatch(s.current)));
      setEuphonyImprovements(prev => prev.filter(e => isNotMatch(e.current)));
      setPunctuationIssues(prev => prev.filter(p => isNotMatch(p.currentSentence))); 
      
      setLanguageStyleMixing(prev => {
        if (!prev || !prev.corrections) return prev;
        const filtered = prev.corrections.filter(c => isNotMatch(c.current));
        return filtered.length > 0 ? { ...prev, corrections: filtered } : null;
      });

      showMessage(`সংশোধিত হয়েছে ✓`, 'success');
    } else {
      showMessage(`শব্দটি ডকুমেন্টে খুঁজে পাওয়া যায়নি।`, 'error');
    }
  };

  const dismissSuggestion = (type: 'spelling' | 'tone' | 'style' | 'mixing' | 'punct' | 'euphony', textToDismiss: string) => {
    const target = normalize(textToDismiss);
    const isNotMatch = (t: string) => normalize(t) !== target;

    switch(type) {
      case 'spelling':
        setCorrections(prev => prev.filter(c => isNotMatch(c.wrong)));
        break;
      case 'tone':
        setToneSuggestions(prev => prev.filter(t => isNotMatch(t.current)));
        break;
      case 'style':
        setStyleSuggestions(prev => prev.filter(s => isNotMatch(s.current)));
        break;
      case 'mixing':
        setLanguageStyleMixing(prev => {
          if (!prev || !prev.corrections) return prev;
          const filtered = prev.corrections.filter(c => isNotMatch(c.current));
          return filtered.length > 0 ? { ...prev, corrections: filtered } : null;
        });
        break;
      case 'punct':
        setPunctuationIssues(prev => prev.filter(p => isNotMatch(p.currentSentence)));
        break;
      case 'euphony':
        setEuphonyImprovements(prev => prev.filter(e => isNotMatch(e.current)));
        break;
    }
  };

  const clearHighlights = async () => {
    await Word.run(async (context) => {
      context.document.body.font.highlightColor = "None";
      await context.sync();
    }).catch(console.error);
  };

  /* --- GEMINI JSON HELPER --- */
  const callGeminiJson = async (
    prompt: string,
    { temperature = 0.2 }: { temperature?: number } = {}
  ): Promise<any | null> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature
          }
        })
      });
    } catch (err: any) {
      console.error('Network error:', err);
      throw new Error('ইন্টারনেট সংযোগে সমস্যা হয়েছে। দয়া করে নেটওয়ার্ক চেক করে আবার চেষ্টা করুন।');
    }

    if (!response.ok) {
      const status = response.status;
      let userMessage = '';

      if (status === 401 || status === 403) {
        userMessage = 'API Key বা অনুমতি (permission) সংক্রান্ত সমস্যা হয়েছে। Key সঠিক কিনা এবং প্রয়োজনীয় access আছে কিনা চেক করুন।';
      } else if (status === 429) {
        userMessage = 'অনেক বেশি রিকুয়েস্ট পাঠানো হয়েছে। কিছুক্ষণ বিরতি নিয়ে আবার চেষ্টা করুন (rate limit)।';
      } else if (status === 404) {
        userMessage = `মডেল (${selectedModel}) খুঁজে পাওয়া যায়নি (404)। সেটিংস থেকে সঠিক মডেল (যেমন: gemini-2.5-flash) সিলেক্ট করুন।`;
      } else if (status >= 500) {
        userMessage = 'Gemini সার্ভারে সাময়িক সমস্যা হচ্ছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
      } else if (status === 400) {
        userMessage = 'রিকুয়েস্ট ফরম্যাট সঠিক নয় বা টেক্সট অনেক বেশি বড়।';
      } else {
        userMessage = `Gemini সার্ভার থেকে ত্রুটি (স্ট্যাটাস: ${status})।`;
      }

      const bodyText = await response.text().catch(() => '');
      console.error('Gemini API error:', status, bodyText);
      throw new Error(userMessage);
    }

    const data = await response.json();

    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;

    const raw = parts.map((p: any) => p.text ?? '').join('').trim();
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e) {
          console.error('JSON parse error (inner):', e, match[0]);
          return null;
        }
      }
      console.error('JSON parse error (outer): raw =', raw);
      return null;
    }
  };

  /* --- API LOGIC (Sequential, NO CHUNKING) --- */
  const checkSpelling = async () => {
    if (!apiKey) {
      showMessage('অনুগ্রহ করে প্রথমে API Key দিন', 'error');
      setActiveModal('settings');
      return;
    }

    const text = await getTextFromWord();
    if (!text || text.trim().length === 0) {
      showMessage('টেক্সট নির্বাচন করুন বা কার্সার রাখুন', 'error');
      return;
    }

    setIsLoading(true);
    setLoadingText('বিশ্লেষণ করা হচ্ছে...');
    
    // Reset states
    setCorrections([]);
    setToneSuggestions([]);
    setStyleSuggestions([]);
    setLanguageStyleMixing(null);
    setPunctuationIssues([]);
    setEuphonyImprovements([]);
    setContentAnalysis(null);
    setStats({ totalWords: 0, errorCount: 0, accuracy: 100 });

    await clearHighlights();

    try {
      // 1. Perform Main Check (Whole Text - Single Request)
      setLoadingText('বানান ও ব্যাকরণ দেখা হচ্ছে...');
      await performMainCheck(text);

      // Add Delay (2s) to avoid Rate Limit (5 RPM)
      await delay(2000);

      // 2. Perform Tone Check (if selected)
      if (selectedTone) {
        setLoadingText('টোন বিশ্লেষণ হচ্ছে...');
        await performToneCheck(text);
        await delay(2000); 
      }

      // 3. Perform Style Check (if selected)
      if (selectedStyle !== 'none') {
        setLoadingText('ভাষারীতি বিশ্লেষণ হচ্ছে...');
        await performStyleCheck(text);
        await delay(2000); 
      }

      // 4. Content Analysis
      setLoadingText('সারাংশ তৈরি হচ্ছে...');
      await analyzeContent(text);

    } catch (error: any) {
      console.error(error);
      showMessage(
        error?.message || 'ত্রুটি হয়েছে। API Key, Model বা নেটওয়ার্ক চেক করুন।',
        'error'
      );
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // UPDATED: No loop, sends the whole text at once
  const performMainCheck = async (text: string) => {
    
    // Direct call with the whole text
    const prompt = buildMainPrompt(text, docType);
    const result = await callGeminiJson(prompt, { temperature: 0.1 });
    
    if (!result) return;

    // Process result (no chunk offsetting needed as we sent whole text)
    const allSpelling: Correction[] = (result.spellingErrors || []).map((e: any) => ({
      ...e,
      position: typeof e.position === 'number' ? e.position : undefined
    }));

    const allPunct: PunctuationIssue[] = (result.punctuationIssues || []).map((p: any) => ({
      ...p,
      position: typeof p.position === 'number' ? p.position : undefined
    }));

    const allEuphony: EuphonyImprovement[] = (result.euphonyImprovements || []).map((e: any) => ({
      ...e,
      position: typeof e.position === 'number' ? e.position : undefined
    }));

    let globalMixing: StyleMixing | null = result.languageStyleMixing || null;
    if (globalMixing && globalMixing.corrections) {
       globalMixing.corrections = globalMixing.corrections.map((c: any) => ({
          ...c,
          position: typeof c.position === 'number' ? c.position : undefined
       }));
    }

    // Sort results
    allSpelling.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    allPunct.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    allEuphony.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    if (globalMixing && globalMixing.corrections) {
      globalMixing.corrections.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    // Update State
    setCorrections(allSpelling);
    setPunctuationIssues(allPunct);
    setEuphonyImprovements(allEuphony);
    setLanguageStyleMixing(globalMixing);

    const words = text.trim().length > 0 ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const errors = allSpelling.length;

    setStats({
      totalWords: words,
      errorCount: errors,
      accuracy: words > 0 ? Math.round(((words - errors) / words) * 100) : 100
    });

    // Highlight
    for (const err of allSpelling) {
      await highlightInWord(err.wrong, '#fee2e2', err.position);
    }
  };

  const performToneCheck = async (text: string) => {
    const prompt = buildTonePrompt(text, selectedTone);
    const result = await callGeminiJson(
      `${prompt}\n\nযদি কোন পরিবর্তন প্রয়োজন না হয় তাহলে "toneConversions": [] খালি array রাখবেন।`,
      { temperature: 0.2 }
    );
    if (!result) return;

    const toneConversions: ToneSuggestion[] = (result.toneConversions || []).map((t: any) => ({
      ...t,
      position: typeof t.position === 'number' ? t.position : undefined
    }));

    toneConversions.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    setToneSuggestions(toneConversions);

    for (const t of toneConversions) {
      await highlightInWord(t.current, '#fef3c7', t.position);
    }
  };

  const performStyleCheck = async (text: string) => {
    const prompt = buildStylePrompt(text, selectedStyle);
    const result = await callGeminiJson(
      `${prompt}\n\nযদি কোন পরিবর্তন প্রয়োজন না হয় তাহলে "styleConversions": [] খালি array রাখবেন।`,
      { temperature: 0.2 }
    );
    if (!result) return;

    const styleConversions: StyleSuggestion[] = (result.styleConversions || []).map((s: any) => ({
      ...s,
      position: typeof s.position === 'number' ? s.position : undefined
    }));

    styleConversions.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    setStyleSuggestions(styleConversions);

    for (const s of styleConversions) {
      await highlightInWord(s.current, '#ccfbf1', s.position);
    }
  };

  const analyzeContent = async (text: string) => {
    const cfg = DOC_TYPE_CONFIG[docType];
    const prompt = `
বাংলা লেখাটি খুব সংক্ষেপে বিশ্লেষণ করুন।

ধরুন এটি: ${cfg.label}

${cfg.contentHint}

"""${text}"""

Response format (ONLY valid JSON, no extra text):

{
  "contentType": "লেখার ধরন (১-২ শব্দ)",
  "description": "খুব সংক্ষিপ্ত বর্ণনা (১ লাইন)",
  "missingElements": ["গুরুত্বপূর্ণ ১-২টি জিনিস যা নেই"],
  "suggestions": ["১টি প্রধান পরামর্শ"]
}
`;
    const result = await callGeminiJson(prompt, { temperature: 0.4 });
    if (!result) return;

    setContentAnalysis(result as ContentAnalysis);
  };

  /* --- RENDER HELPERS --- */
  const getToneName = (t: string) => {
    const map: Record<string, string> = {
      'formal': '📋 আনুষ্ঠানিক', 'informal': '💬 অনানুষ্ঠানিক', 'professional': '💼 পেশাদার',
      'friendly': '😊 বন্ধুত্বপূর্ণ', 'respectful': '🙏 সম্মানজনক', 'persuasive': '💪 প্রভাবশালী',
      'neutral': '⚖️ নিরপেক্ষ', 'academic': '📚 শিক্ষামূলক'
    };
    return map[t] || t;
  };

  const shouldShowSection = (key: SectionKey): boolean => {
    if (viewFilter === 'all') return true;
    if (viewFilter === 'spelling') return key === 'spelling';
    if (viewFilter === 'punctuation') return key === 'punctuation';
    return true;
  };

  /* --- UI RENDER --- */
  return (
    <div className="app-container">
      {/* Header & Toolbar */}
      <div className="header-section">
  <div className="header-top">
    {/* বাম পাশে মেনু বাটন */}
    <button
      className="menu-btn header-menu-btn"
      onClick={() => setActiveModal('mainMenu')}
      title="মেনু"
    >
      ☰
    </button>

    {/* মাঝে টাইটেল */}
    <div className="app-title">
      <h1>🌟 ভাষা মিত্র</h1>
      <p>বাংলা বানান ও ব্যাকরণ পরীক্ষক</p>
    </div>

    {/* ডান পাশে ফাঁকা স্পেসার – শিরোনামকে ঠিকমতো মাঝখানে রাখার জন্য */}
    <div className="header-spacer" />
  </div>

  <div className="toolbar">
    <div className="toolbar-top">
      {/* শুধু পরীক্ষা বাটন, ডান দিকে */}
      <button 
        onClick={checkSpelling} 
        disabled={isLoading}
        className="btn-check"
      >
        {isLoading ? '...' : '🔍 পরীক্ষা করুন'}
      </button>
    </div>

    <div className="toolbar-bottom">
      <div className="view-filter">
        <button
          className={viewFilter === 'all' ? 'active' : ''}
          onClick={() => setViewFilter('all')}
        >
          সব
        </button>
        <button
          className={viewFilter === 'spelling' ? 'active' : ''}
          onClick={() => setViewFilter('spelling')}
        >
          শুধু বানান
        </button>
        <button
          className={viewFilter === 'punctuation' ? 'active' : ''}
          onClick={() => setViewFilter('punctuation')}
        >
          শুধু বিরামচিহ্ন
        </button>
      </div>
    </div>
  </div>
</div>

      {/* Selection Display */}
      {(selectedTone || selectedStyle !== 'none' || docType !== 'generic') && (
        <div className="selection-display">
          {selectedTone && (
             <span className="selection-tag tone-tag">
               {getToneName(selectedTone)}
               <button onClick={() => setSelectedTone('')} className="clear-btn">✕</button>
             </span>
          )}
          {selectedStyle !== 'none' && (
             <span className="selection-tag style-tag">
               {selectedStyle === 'sadhu' ? '📜 সাধু রীতি' : '💬 চলিত রীতি'}
               <button onClick={() => setSelectedStyle('none')} className="clear-btn">✕</button>
             </span>
          )}
          {docType && (
            <span className="selection-tag doc-type-tag">
              📂 {getDocTypeLabel(docType)}
              <button onClick={() => setDocType('generic')} className="clear-btn">✕</button>
            </span>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="content-area">
        
        {isLoading && (
          <div className="loading-box">
            <div className="loader"></div>
            <p>{loadingText}</p>
          </div>
        )}

        {message && (
          <div className={`message-box ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && stats.totalWords === 0 && !message && (
          <div className="empty-state">
            <div style={{fontSize: '40px', marginBottom: '12px'}}>✨</div>
            <p style={{fontSize: '13px', fontWeight: 500}}>সাজেশন এখানে দেখা যাবে</p>
            <p style={{fontSize: '11px', marginTop: '6px'}}>টেক্সট সিলেক্ট করে "পরীক্ষা করুন" ক্লিক করুন</p>
          </div>
        )}

        {/* Stats */}
        {stats.totalWords > 0 && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="val" style={{color: '#667eea'}}>{stats.totalWords}</div>
              <div className="lbl">শব্দ</div>
            </div>
            <div className="stat-card">
              <div className="val" style={{color: '#dc2626'}}>{stats.errorCount}</div>
              <div className="lbl">ভুল</div>
            </div>
            <div className="stat-card">
              <div className="val" style={{color: '#16a34a'}}>{stats.accuracy}%</div>
              <div className="lbl">শুদ্ধতা</div>
            </div>
          </div>
        )}

        {/* Content Analysis */}
        {contentAnalysis && shouldShowSection('content') && (
          <>
            <div className="section-header">
              <h3>📋 কনটেন্ট বিশ্লেষণ</h3>
              <button
                className="collapse-btn"
                onClick={() => toggleSection('content')}
              >
                {collapsedSections.content ? '➕' : '➖'}
              </button>
            </div>
            {!collapsedSections.content && (
              <>
                <div className="analysis-card content-analysis">
                  <h3>📋 {contentAnalysis.contentType}</h3>
                  {contentAnalysis.description && <p>{contentAnalysis.description}</p>}
                </div>
                {contentAnalysis.missingElements && contentAnalysis.missingElements.length > 0 && (
                  <div className="analysis-card missing-analysis">
                    <h3 style={{color:'#78350f'}}>⚠️ যা যোগ করুন</h3>
                    <ul>{contentAnalysis.missingElements.map((e, i) => <li key={i}>{e}</li>)}</ul>
                  </div>
                )}
                {contentAnalysis.suggestions && contentAnalysis.suggestions.length > 0 && (
                  <div className="analysis-card suggestion-analysis">
                    <h3 style={{color:'#115e59'}}>✨ পরামর্শ</h3>
                    <ul>{contentAnalysis.suggestions.map((e, i) => <li key={i}>{e}</li>)}</ul>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Spelling Errors */}
        {corrections.length > 0 && shouldShowSection('spelling') && (
          <>
            <div className="section-header">
              <h3>📝 বানান ভুল</h3>
              <span className="section-badge" style={{background: '#fee2e2', color: '#dc2626'}}>{corrections.length}টি</span>
              <button
                className="collapse-btn"
                onClick={() => toggleSection('spelling')}
              >
                {collapsedSections.spelling ? '➕' : '➖'}
              </button>
            </div>
            {!collapsedSections.spelling && corrections.map((c, i) => (
              <div
                key={i}
                className="suggestion-card error-card"
                style={{position:'relative'}}
                onMouseEnter={() => highlightInWord(c.wrong, '#fee2e2', c.position)}
              >
                <button onClick={() => dismissSuggestion('spelling', c.wrong)} className="dismiss-btn" title="বাদ দিন">✕</button>
                <div className="wrong-word">❌ {c.wrong}</div>
                {c.suggestions.map((s, j) => (
                  <button
                    key={j}
                    onClick={() => replaceInWord(c.wrong, s, c.position)}
                    className="suggestion-btn success-btn"
                  >
                    ✓ {s}
                  </button>
                ))}
              </div>
            ))}
          </>
        )}

        {/* Tone Suggestions */}
        {toneSuggestions.length > 0 && shouldShowSection('tone') && (
          <>
            <div className="section-header">
              <h3>💬 টোন রূপান্তর</h3>
              <span className="section-badge" style={{background: '#fef3c7', color: '#92400e'}}>{getToneName(selectedTone)}</span>
              <button
                className="collapse-btn"
                onClick={() => toggleSection('tone')}
              >
                {collapsedSections.tone ? '➕' : '➖'}
              </button>
            </div>
            {!collapsedSections.tone && toneSuggestions.map((t, i) => (
              <div
                key={i}
                className="suggestion-card warning-card"
                style={{position:'relative'}}
                onMouseEnter={() => highlightInWord(t.current, '#fef3c7', t.position)}
              >
                <button onClick={() => dismissSuggestion('tone', t.current)} className="dismiss-btn" title="বাদ দিন">✕</button>
                <div className="wrong-word" style={{color: '#b45309'}}>💡 {t.current}</div>
                {t.reason && <div className="reason">{t.reason}</div>}
                <button
                  onClick={() => replaceInWord(t.current, t.suggestion, t.position)}
                  className="suggestion-btn warning-btn"
                >
                  ✨ {t.suggestion}
                </button>
              </div>
            ))}
          </>
        )}

        {/* Style Suggestions */}
        {styleSuggestions.length > 0 && shouldShowSection('style') && (
          <>
            <div className="section-header">
              <h3>📝 ভাষারীতি</h3>
              <span className="section-badge" style={{background: selectedStyle === 'sadhu' ? '#fef3c7' : '#ccfbf1', color: selectedStyle === 'sadhu' ? '#92400e' : '#0f766e'}}>
                 {selectedStyle === 'sadhu' ? '📜 সাধু রীতি' : '💬 চলিত রীতি'}
               </span>
              <button
                className="collapse-btn"
                onClick={() => toggleSection('style')}
              >
                {collapsedSections.style ? '➕' : '➖'}
              </button>
            </div>
            {!collapsedSections.style && styleSuggestions.map((s, i) => (
              <div
                key={i}
                className="suggestion-card info-card"
                style={{borderColor: selectedStyle === 'sadhu' ? '#fbbf24' : '#5eead4', position:'relative'}}
                onMouseEnter={() => highlightInWord(s.current, '#ccfbf1', s.position)}
              >
                <button onClick={() => dismissSuggestion('style', s.current)} className="dismiss-btn" title="বাদ দিন">✕</button>
                <div style={{display:'flex', gap:'6px', alignItems:'center', marginBottom:'4px'}}>
                    <span style={{fontSize:'13px', fontWeight:600, color: selectedStyle === 'sadhu' ? '#92400e' : '#0f766e'}}>🔄 {s.current}</span>
                    {s.type && <span style={{fontSize:'9px', background:'white', padding:'2px 6px', borderRadius:'10px'}}>{s.type}</span>}
                </div>
                <button
                  onClick={() => replaceInWord(s.current, s.suggestion, s.position)}
                  className="suggestion-btn"
                  style={{
                    background: selectedStyle === 'sadhu' ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
                    borderColor: selectedStyle === 'sadhu' ? '#fbbf24' : '#5eead4',
                    color: selectedStyle === 'sadhu' ? '#92400e' : '#0f766e'
                  }}
                >
                  ➜ {s.suggestion}
                </button>
              </div>
            ))}
          </>
        )}

        {/* Auto Style Mixing Detection */}
        {languageStyleMixing?.detected && selectedStyle === 'none' && shouldShowSection('mixing') && (
          <>
            <div className="section-header">
              <h3>🔄 মিশ্রণ সনাক্ত</h3>
              <span className="section-badge" style={{background: '#e9d5ff', color: '#6b21a8'}}>স্বয়ংক্রিয়</span>
              <button
                className="collapse-btn"
                onClick={() => toggleSection('mixing')}
              >
                {collapsedSections.mixing ? '➕' : '➖'}
              </button>
            </div>
            {!collapsedSections.mixing && (
              <>
                <div className="suggestion-card purple-card" style={{background: 'rgba(237, 233, 254, 0.5)'}}>
                  <div style={{fontSize: '13px', fontWeight: 600, color: '#6b21a8'}}>
                    প্রস্তাবিত: {languageStyleMixing.recommendedStyle}
                  </div>
                  <div style={{fontSize: '10px', color: '#6b7280', marginTop: '4px'}}>{languageStyleMixing.reason}</div>
                </div>
                {languageStyleMixing.corrections?.map((c, i) => (
                  <div
                    key={i}
                    className="suggestion-card purple-card-light"
                    style={{position:'relative'}}
                    onMouseEnter={() => highlightInWord(c.current, '#e9d5ff', c.position)}
                  >
                    <button onClick={() => dismissSuggestion('mixing', c.current)} className="dismiss-btn" title="বাদ দিন">✕</button>
                    <div style={{display:'flex', gap:'6px', alignItems:'center', marginBottom:'4px'}}>
                      <span style={{fontSize:'13px', fontWeight:600, color: '#7c3aed'}}>🔄 {c.current}</span>
                      <span style={{fontSize:'9px', background:'#e9d5ff', color:'#6b21a8', padding:'2px 6px', borderRadius:'10px'}}>{c.type}</span>
                    </div>
                    <button
                      onClick={() => replaceInWord(c.current, c.suggestion, c.position)}
                      className="suggestion-btn purple-btn"
                    >
                      ➜ {c.suggestion}
                    </button>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* Punctuation */}
        {punctuationIssues.length > 0 && shouldShowSection('punctuation') && (
          <>
            <div className="section-header">
               <h3>🔤 বিরাম চিহ্ন</h3>
               <span className="section-badge" style={{background: '#fed7aa', color: '#c2410c'}}>{punctuationIssues.length}টি</span>
               <button
                 className="collapse-btn"
                 onClick={() => toggleSection('punctuation')}
               >
                 {collapsedSections.punctuation ? '➕' : '➖'}
               </button>
            </div>
            {!collapsedSections.punctuation && punctuationIssues.map((p, i) => (
              <div
                key={i}
                className="suggestion-card orange-card"
                style={{position:'relative'}}
                onMouseEnter={() => highlightInWord(p.currentSentence, '#ffedd5')}
              >
                <button onClick={() => dismissSuggestion('punct', p.currentSentence)} className="dismiss-btn" title="বাদ দিন">✕</button>
                <div className="wrong-word" style={{color: '#ea580c'}}>⚠️ {p.issue}</div>
                <div className="reason">{p.explanation}</div>
                <button
                  onClick={() => replaceInWord(p.currentSentence, p.correctedSentence)}
                  className="suggestion-btn orange-btn"
                >
                  ✓ {p.correctedSentence}
                </button>
              </div>
            ))}
          </>
        )}
        
         {/* Euphony */}
        {euphonyImprovements.length > 0 && shouldShowSection('euphony') && (
          <>
            <div className="section-header">
              <h3>🎵 শ্রুতিমধুরতা</h3>
               <span className="section-badge" style={{background: '#fce7f3', color: '#be185d'}}>{euphonyImprovements.length}টি</span>
               <button
                 className="collapse-btn"
                 onClick={() => toggleSection('euphony')}
               >
                 {collapsedSections.euphony ? '➕' : '➖'}
               </button>
            </div>
            {!collapsedSections.euphony && euphonyImprovements.map((e, i) => (
              <div
                key={i}
                className="suggestion-card"
                style={{borderLeft:'4px solid #db2777', position:'relative'}}
                onMouseEnter={() => highlightInWord(e.current, '#fce7f3', e.position)}
              >
                 <button onClick={() => dismissSuggestion('euphony', e.current)} className="dismiss-btn" title="বাদ দিন">✕</button>
                 <div className="wrong-word" style={{color: '#db2777'}}>🎵 {e.current}</div>
                <div className="reason">{e.reason}</div>
                {e.suggestions.map((s, j) => (
                     <button
                       key={j}
                       onClick={() => replaceInWord(e.current, s, e.position)}
                       className="suggestion-btn"
                       style={{background: '#fce7f3', borderColor: '#f9a8d4', color: '#9f1239'}}
                     >
                      ♪ {s}
                    </button>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="footer">
        <p style={{fontSize:'15px', color:'rgba(255,255,255,0.9)', fontWeight:600}}>Developed by: হিমাদ্রি বিশ্বাস</p>
        <p style={{fontSize:'12px', color:'rgba(255,255,255,0.7)'}}>☎ +880 9696 196566</p>
      </div>

      {/* --- MODALS --- */}

      {/* Main Menu Modal */}
      {activeModal === 'mainMenu' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header menu-header">
              <h3>☰ মেনু</h3>
              <button onClick={() => setActiveModal('none')}>✕</button>
            </div>
            <div className="modal-body">
              <div
                className="option-item"
                onClick={() => setActiveModal('tone')}
              >
                <div className="opt-icon">🗣️</div>
                <div style={{flex:1}}>
                  <div className="opt-title">টোন / ভাব</div>
                  <div className="opt-desc">
                    {selectedTone ? getToneName(selectedTone) : 'কোনো নির্দিষ্ট টোন সেট নেই'}
                  </div>
                </div>
              </div>

              <div
                className="option-item"
                onClick={() => setActiveModal('style')}
              >
                <div className="opt-icon">📝</div>
                <div style={{flex:1}}>
                  <div className="opt-title">ভাষারীতি (সাধু / চলিত)</div>
                  <div className="opt-desc">
                    {selectedStyle === 'none'
                      ? 'স্বয়ংক্রিয় মিশ্রণ সনাক্তকরণ চালু'
                      : selectedStyle === 'sadhu'
                      ? 'বর্তমান: সাধু রীতি'
                      : 'বর্তমান: চলিত রীতি'}
                  </div>
                </div>
              </div>

              <div
                className="option-item"
                onClick={() => setActiveModal('doctype')}
              >
                <div className="opt-icon">📂</div>
                <div style={{flex:1}}>
                  <div className="opt-title">ডকুমেন্ট টাইপ</div>
                  <div className="opt-desc">
                    বর্তমান: {getDocTypeLabel(docType)}
                  </div>
                </div>
              </div>

              <div
                className="option-item"
                onClick={() => setActiveModal('settings')}
              >
                <div className="opt-icon">⚙️</div>
                <div style={{flex:1}}>
                  <div className="opt-title">সেটিংস</div>
                  <div className="opt-desc">API Key, মডেল, ডিফল্ট ডক টাইপ</div>
                </div>
              </div>

              <div
                className="option-item"
                onClick={() => setActiveModal('instructions')}
              >
                <div className="opt-icon">❓</div>
                <div style={{flex:1}}>
                  <div className="opt-title">ব্যবহার নির্দেশিকা</div>
                  <div className="opt-desc">কিভাবে এই অ্যাড-ইন ব্যবহার করবেন</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header settings-header">
              <h3>⚙️ সেটিংস</h3>
              <button onClick={() => setActiveModal('none')}>✕</button>
            </div>
            <div className="modal-body">
              <label>🔑 Google Gemini API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="আপনার API Key এখানে দিন" />
              
              <label>🤖 AI Model</label>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Your Current Model)</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                <option value="gemma-3-4b">Gemma 3 (4b)</option>
              </select>

              <label>📂 ডকুমেন্ট টাইপ (ডিফল্ট)</label>
              <select value={docType} onChange={e => setDocType(e.target.value as DocType)}>
                <option value="generic">সাধারণ লেখা</option>
                <option value="academic">একাডেমিক লেখা</option>
                <option value="official">অফিশিয়াল চিঠি</option>
                <option value="marketing">মার্কেটিং কপি</option>
                <option value="social">সোশ্যাল মিডিয়া পোস্ট</option>
              </select>
              
              <div style={{display:'flex', gap:'10px'}}>
                  <button onClick={saveSettings} className="btn-primary-full">✓ সংরক্ষণ</button>
                  <button onClick={() => setActiveModal('none')} style={{padding:'12px 20px', background:'#f3f4f6', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:600}}>বাতিল</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {activeModal === 'instructions' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header instructions-header">
              <h3>🎯 ব্যবহার নির্দেশিকা</h3>
              <button onClick={() => setActiveModal('none')}>✕</button>
            </div>
            <div className="modal-body">
              <ol style={{paddingLeft: '18px', lineHeight: '2', fontSize: '13px'}}>
                <li style={{marginBottom:'10px'}}>⚙️ সেটিংস থেকে API Key দিন</li>
                <li style={{marginBottom:'10px'}}>📂 প্রয়োজন হলে ডক টাইপ নির্বাচন করুন (একাডেমিক/অফিসিয়াল/মার্কেটিং ইত্যাদি)</li>
                <li style={{marginBottom:'10px'}}>✍️ বাংলা টেক্সট সিলেক্ট করুন অথবা সম্পূর্ণ ডকুমেন্ট চেক করুন</li>
                <li style={{marginBottom:'10px'}}>💬 <strong>টোন</strong> (মেনু থেকে) নির্বাচন করুন (ঐচ্ছিক)</li>
                <li style={{marginBottom:'10px'}}>📝 <strong>ভাষারীতি</strong> (মেনু থেকে) নির্বাচন করুন (ঐচ্ছিক)</li>
                <li style={{marginBottom:'10px'}}>🔍 "পরীক্ষা করুন" বাটনে ক্লিক করুন</li>
                <li style={{marginBottom:'10px'}}>🔎 উপরের ফিল্টার থেকে "শুধু বানান / শুধু বিরামচিহ্ন / সব" বেছে নিন</li>
                <li>✓ সাজেশনে ক্লিক করে প্রতিস্থাপন করুন বা ✕ দিয়ে বাতিল করুন</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Tone Modal */}
      {activeModal === 'tone' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header tone-header">
              <h3>💬 টোন/ভাব নির্বাচন</h3>
              <button onClick={() => setActiveModal('none')}>✕</button>
            </div>
            <div className="modal-body">
              {[
                {id: '', icon: '❌', title: 'কোনটি নয়', desc: 'শুধু বানান ও ব্যাকরণ পরীক্ষা'},
                {id: 'formal', icon: '📋', title: 'আনুষ্ঠানিক (Formal)', desc: 'দাপ্তরিক চিঠি, আবেদন, প্রতিবেদন'},
                {id: 'informal', icon: '💬', title: 'অনানুষ্ঠানিক (Informal)', desc: 'ব্যক্তিগত চিঠি, ব্লগ, সোশ্যাল মিডিয়া'},
                {id: 'professional', icon: '💼', title: 'পেশাদার (Professional)', desc: 'ব্যবসায়িক যোগাযোগ, কর্পোরেট'},
                {id: 'friendly', icon: '😊', title: 'বন্ধুত্বপূর্ণ (Friendly)', desc: 'উষ্ণ, আন্তরিক যোগাযোগ'},
                {id: 'respectful', icon: '🙏', title: 'সম্মানজনক (Respectful)', desc: 'বয়োজ্যেষ্ঠ বা সম্মানিত ব্যক্তি'},
                {id: 'persuasive', icon: '💪', title: 'প্রভাবশালী (Persuasive)', desc: 'মার্কেটিং, বিক্রয়, প্রচারণা'},
                {id: 'neutral', icon: '⚖️', title: 'নিরপেক্ষ (Neutral)', desc: 'সংবাদ, তথ্যমূলক লেখা'},
                {id: 'academic', icon: '📚', title: 'শিক্ষামূলক (Academic)', desc: 'গবেষণা পত্র, প্রবন্ধ'}
              ].map(opt => (
                <div
                  key={opt.id}
                  className={`option-item ${selectedTone === opt.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedTone(opt.id); setActiveModal('none'); }}
                >
                  <div className="opt-icon">{opt.icon}</div>
                  <div style={{flex:1}}>
                    <div className="opt-title">{opt.title}</div>
                    <div className="opt-desc">{opt.desc}</div>
                  </div>
                  {selectedTone === opt.id && <div className="check-mark">✓</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Style Modal */}
      {activeModal === 'style' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header style-header">
              <h3>📝 ভাষারীতি নির্বাচন</h3>
              <button onClick={() => setActiveModal('none')}>✕</button>
            </div>
            <div className="modal-body">
              {[
                {id: 'none', icon: '❌', title: 'কোনটি নয়', desc: 'স্বয়ংক্রিয় মিশ্রণ সনাক্তকরণ চালু থাকবে'},
                {id: 'sadhu', icon: '📜', title: 'সাধু রীতি', desc: 'করিতেছি, করিয়াছি, তাহার, যাহা'},
                {id: 'cholito', icon: '💬', title: 'চলিত রীতি', desc: 'করছি, করেছি, তার, যা'}
              ].map(opt => (
                <div
                  key={opt.id}
                  className={`option-item ${selectedStyle === opt.id ? 'selected' : ''}`}
                  onClick={() => { setSelectedStyle(opt.id as any); setActiveModal('none'); }}
                >
                  <div className="opt-icon">{opt.icon}</div>
                  <div style={{flex:1}}>
                    <div className="opt-title">{opt.title}</div>
                    <div className="opt-desc">{opt.desc}</div>
                  </div>
                  {selectedStyle === opt.id && <div className="check-mark">✓</div>}
                </div>
              ))}
              
               <div style={{padding: '10px', background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)', borderRadius: '10px', border: '2px solid #c4b5fd', marginTop: '10px'}}>
                <h4 style={{fontSize: '12px', fontWeight: 'bold', color: '#5b21b6', marginBottom: '6px'}}>📖 পার্থক্য</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px'}}>
                  <div>
                    <p style={{fontWeight: 600, color: '#7c3aed', marginBottom: '2px'}}>সাধু:</p>
                    <p style={{color: '#6b7280'}}>করিতেছি, তাহার</p>
                  </div>
                  <div>
                    <p style={{fontWeight: 600, color: '#0d9488', marginBottom: '2px'}}>চলিত:</p>
                    <p style={{color: '#6b7280'}}>করছি, তার</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doc Type Modal */}
      {activeModal === 'doctype' && (
        <div className="modal-overlay" onClick={() => setActiveModal('none')}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header style-header">
              <h3>📂 ডকুমেন্ট টাইপ নির্বাচন</h3>
              <button onClick={() => setActiveModal('none')}>✕</button>
            </div>
            <div className="modal-body">
              {(['generic', 'academic', 'official', 'marketing', 'social'] as DocType[]).map(dt => {
                const cfg = DOC_TYPE_CONFIG[dt];
                return (
                  <div
                    key={dt}
                    className={`option-item ${docType === dt ? 'selected' : ''}`}
                    onClick={() => {
                      setDocType(dt);
                      if (!selectedTone && cfg.defaultTone) {
                        setSelectedTone(cfg.defaultTone);
                      }
                      setActiveModal('none');
                    }}
                  >
                    <div className="opt-icon">📂</div>
                    <div style={{flex:1}}>
                      <div className="opt-title">{cfg.label}</div>
                      <div className="opt-desc">{cfg.description}</div>
                    </div>
                    {docType === dt && <div className="check-mark">✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ----------------------------------------------------------------------
// INITIALIZE OFFICE & REACT ENTRY POINT
// ----------------------------------------------------------------------
Office.onReady(() => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
  }
});
