import React from "react";
import { assets } from "../../assets/assets";

const Footer = () => {
  const handleLogoClick = (e) => {
    e.preventDefault();
    // Force navigation to home page
    window.location.href = "/";
  };

  return (
    <footer className="flex md:flex-row flex-col-reverse items-center justify-between text-left w-full px-8 border-t">
      <div className="flex items-center gap-4">
        <a href="/" onClick={handleLogoClick} className="hidden md:block">
          <img className="w-20" src={assets.logo} alt="logo" />
        </a>
        <div className="hidden md:block h-7 w-px bg-gray-500/60"></div>
        <p className="py-4 text-center text-xs md:text-sm text-gray-500">
          Copyright 2025 @ Sumita. All Rights Reserved.
        </p>
      </div>
      <div className="flex items-center gap-3 max-md:mt-4">
        <a href="#" target="_blank" rel="noopener noreferrer">
          <img src={assets.facebook_icon} alt="facebook_icon" />
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer">
          <img src={assets.twitter_icon} alt="twitter_icon" />
        </a>
        <a href="#" target="_blank" rel="noopener noreferrer">
          <img src={assets.instagram_icon} alt="instagram_icon" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
