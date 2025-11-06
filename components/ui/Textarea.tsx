import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, ...props }) => {
  return (
    <div>
      <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">
        {label}
      </label>
      <textarea
        {...props}
        className="w-full bg-secondary text-text-primary rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent border border-transparent focus:border-accent font-mono text-sm resize-y"
      />
    </div>
  );
};

export default Textarea;