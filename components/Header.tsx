import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-3 px-4 sm:px-6 lg:px-8 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center">
            <h1 className="text-lg font-medium text-zinc-200">
                AI Vision Toolkit
            </h1>
        </div>
    </header>
  );
};

export default Header;