
import React from 'react';

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-lg hover:border-purple-500 hover:scale-105 transition-all duration-300 ease-in-out flex flex-col items-start">
      <div className="mb-4 bg-slate-700/50 p-3 rounded-lg text-purple-400">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
};

export default InfoCard;
