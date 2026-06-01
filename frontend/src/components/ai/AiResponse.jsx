const splitMarkdown = (text = '') =>
  String(text)
    .split('\n')
    .map((line) => line.trimEnd());

const renderInline = (line) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

export default function AiResponse({ text, className = '' }) {
  const lines = splitMarkdown(text);
  return (
    <div className={`ai-markdown ${className}`}>
      {lines.map((line, index) => {
        if (!line) return <div key={`gap-${index}`} className="h-2" />;
        if (line.startsWith('- ')) return <p key={index} className="pl-4 before:mr-2 before:content-['•']">{renderInline(line.slice(2))}</p>;
        if (/^\d+\.\s/.test(line)) return <p key={index} className="pl-4">{renderInline(line)}</p>;
        return <p key={index}>{renderInline(line.replace(/^#{1,3}\s/, ''))}</p>;
      })}
    </div>
  );
}
