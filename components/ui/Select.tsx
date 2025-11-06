import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

const Select: React.FC<SelectProps> = ({ label, options, ...props }) => {
  return (
    <div>
      <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">
        {label}
      </label>
      <select
        {...props}
        className="w-full bg-secondary text-text-primary rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent border border-transparent focus:border-accent appearance-none"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;