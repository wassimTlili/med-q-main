
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface AutoParseInputProps {
  onParsedContent: (
    questionText: string, 
    options: { id: string; text: string; explanation?: string }[]
  ) => void;
}

export function AutoParseInput({ onParsedContent }: AutoParseInputProps) {
  const [rawText, setRawText] = useState('');

  const parseContent = () => {
    if (!rawText.trim()) {
      toast({
        title: "Empty input",
        description: "Please paste a question with answer choices",
        variant: "destructive",
      });
      return;
    }

    try {
      // Extract the question text (everything before the first option)
      // Common patterns for answer choices
      const optionPatterns = [
        /([A-E]\)|\([A-E]\)|[A-E]\.)\s*(.*?)(?=(?:[A-E]\)|\([A-E]\)|[A-E]\.)|$)/gs,
        /([a-e]\)|\([a-e]\)|[a-e]\.)\s*(.*?)(?=(?:[a-e]\)|\([a-e]\)|[a-e]\.)|$)/gs,
      ];

      // Find the first pattern that matches
      let matches: RegExpMatchArray[] = [];
      let patternUsed = null;

      for (const pattern of optionPatterns) {
        const tempMatches = [...rawText.matchAll(pattern)];
        if (tempMatches.length >= 2) {
          matches = tempMatches;
          patternUsed = pattern;
          break;
        }
      }

      if (!matches.length || !patternUsed) {
        toast({
          title: "Parsing failed",
          description: "Could not detect answer choices in the format A), B), etc.",
          variant: "destructive",
        });
        return;
      }

      // Find the position of the first match to split the question text
      const firstMatchPos = rawText.search(patternUsed);
      const questionText = firstMatchPos > 0 
        ? rawText.substring(0, firstMatchPos).trim() 
        : "Could not extract question text";

      // Process matches into options with explanations
      const options = matches.map((match, index) => {
        const optionLetter = match[1].replace(/\)|\.|\(|\s/g, '');
        const optionText = match[2].trim();
        
        // Look for explanation after the option text
        // This regex looks for patterns like "Justification :" followed by text
        const explanationRegex = new RegExp(`${optionLetter}[^]*?Justification[^:]*:[^\\n]*(.*?)(?=(?:[A-E][^]*?Justification)|$)`, 's');
        const explanationMatch = rawText.match(explanationRegex);
        
        return {
          id: String(index + 1),
          text: optionText.split("\n")[0].trim(), // Get only the first line of option text
          explanation: explanationMatch ? explanationMatch[1].trim() : undefined
        };
      });

      // Send parsed content to parent component
      onParsedContent(questionText, options);

      toast({
        title: "Parsing successful",
        description: `Extracted ${options.length} answer choices with explanations`,
      });
    } catch (error) {
      console.error("Parsing error:", error);
      toast({
        title: "Parsing error",
        description: "An error occurred while parsing the content",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3 p-4 border rounded-md bg-slate-50">
      <h3 className="text-sm font-medium">Auto-Parse Question</h3>
      <Textarea
        placeholder="Paste your full question with answer choices and explanations..."
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        className="min-h-32 font-mono text-sm"
      />
      <Button 
        type="button" 
        onClick={parseContent} 
        size="sm"
        className="w-full"
      >
        Parse Question
      </Button>
    </div>
  );
}
