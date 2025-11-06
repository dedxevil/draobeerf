import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input: React.FC<InputProps> = ({ label, ...props }) => {
  return (
    <div>
      <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">
        {label}
      </label>
      <input
        {...props}
        className="w-full bg-secondary text-text-primary rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent border border-transparent focus:border-accent"
      />
    </div>
  );
};

export default Input;