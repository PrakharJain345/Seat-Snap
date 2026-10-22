export interface EventVisualMeta {
  imageUrl: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  startingPrice: string;
}

export function getEventVisual(title: string, category: string): EventVisualMeta {
  const lowerTitle = title.toLowerCase();
  const lowerCat = category.toLowerCase();

  // 1. Coldplay
  if (lowerTitle.includes("coldplay")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=80",
      tagline: "Stadium Live with Synchronized Wristbands & Pyrotechnics",
      badge: "World Tour",
      badgeColor: "bg-amber-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // 2. Arijit Singh
  if (lowerTitle.includes("arijit")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80",
      tagline: "Soulful Symphony Live with 45-Piece Grand Orchestra",
      badge: "Orchestra Tour",
      badgeColor: "bg-amber-500 text-white font-bold",
      startingPrice: "₹250",
    };
  }

  // 3. Diljit Dosanjh
  if (lowerTitle.includes("diljit") || lowerTitle.includes("dil-luminati")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80",
      tagline: "Global Punjabi Blockbuster Tour Packed with Stadium Beats",
      badge: "Mega Tour",
      badgeColor: "bg-amber-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // 4. Sunburn / Martin Garrix
  if (lowerTitle.includes("sunburn") || lowerTitle.includes("garrix")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80",
      tagline: "World #1 DJ Live with Massive Laser Arrays & LED Visuals",
      badge: "EDM Festival",
      badgeColor: "bg-emerald-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // 5. Anuv Jain
  if (lowerTitle.includes("anuv")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80",
      tagline: "Intimate Indie Acoustic Melodies & Heartfelt Storytelling",
      badge: "Indie Live",
      badgeColor: "bg-amber-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // 6. Zakir Khan
  if (lowerTitle.includes("zakir")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1000&q=80",
      tagline: "Heartfelt Storytelling & Rib-Tickling Humor",
      badge: "Standup Special",
      badgeColor: "bg-rose-500 text-white font-bold",
      startingPrice: "₹250",
    };
  }

  // 7. Bassi
  if (lowerTitle.includes("bassi")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1000&q=80",
      tagline: "Hilarious Nostalgic Stories & Effortless Crowd Laughs",
      badge: "Comedy Special",
      badgeColor: "bg-rose-500 text-white font-bold",
      startingPrice: "₹250",
    };
  }

  // 8. Samay Raina
  if (lowerTitle.includes("samay")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1000&q=80",
      tagline: "Raw, Spontaneous Dark Comedy & Live Unfiltered Roasts",
      badge: "Live Standup",
      badgeColor: "bg-rose-500 text-white font-bold",
      startingPrice: "₹250",
    };
  }

  // 9. Interstellar
  if (lowerTitle.includes("interstellar")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80",
      tagline: "Christopher Nolan Masterpiece in IMAX 70mm with Hans Zimmer Organ",
      badge: "10th Anniversary IMAX",
      badgeColor: "bg-cyan-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // 10. Dune: Part Two
  if (lowerTitle.includes("dune")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80",
      tagline: "Denis Villeneuve Sci-Fi Epic in Dual-Laser 1.43:1 IMAX",
      badge: "IMAX Experience",
      badgeColor: "bg-cyan-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // 11. The Dark Knight Trilogy
  if (lowerTitle.includes("dark knight")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=1000&q=80",
      tagline: "All-Night IMAX 70mm Marathon of Nolan's Legendary Batman Trilogy",
      badge: "IMAX Marathon",
      badgeColor: "bg-cyan-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // 12. Hamilton
  if (lowerTitle.includes("hamilton")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1000&q=80",
      tagline: "The Pulitzer-Winning Broadway Revolution by Lin-Manuel Miranda",
      badge: "Broadway Musical",
      badgeColor: "bg-amber-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // 13. Mughal-e-Azam
  if (lowerTitle.includes("mughal")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&w=1000&q=80",
      tagline: "Grand Broadway-Scale Theatrical Extravaganza with 350-Member Cast",
      badge: "Grand Musical",
      badgeColor: "bg-amber-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // 14. Phantom of the Opera
  if (lowerTitle.includes("phantom")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=1000&q=80",
      tagline: "Andrew Lloyd Webber's Iconic West End Theatrical Tour",
      badge: "West End Musical",
      badgeColor: "bg-amber-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // Category based defaults
  if (lowerCat.includes("music")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80",
      tagline: "Live Music Concert with High-Fidelity Acoustics",
      badge: "Live Concert",
      badgeColor: "bg-amber-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  if (lowerCat.includes("comedy")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1000&q=80",
      tagline: "Live Standup Comedy & Interactive Crowd Experience",
      badge: "Standup Comedy",
      badgeColor: "bg-rose-500 text-white font-bold",
      startingPrice: "₹250",
    };
  }

  if (lowerCat.includes("movie")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=80",
      tagline: "Cinematic Remastered IMAX Large Format Screening",
      badge: "IMAX Experience",
      badgeColor: "bg-cyan-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  if (lowerCat.includes("theatre")) {
    return {
      imageUrl: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=1000&q=80",
      tagline: "World-Class Proscenium Theatrical Drama & Musical",
      badge: "Theatre & Arts",
      badgeColor: "bg-amber-400 text-black font-extrabold",
      startingPrice: "₹250",
    };
  }

  // Fallback
  return {
    imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1000&q=80",
    tagline: "Live Arena Event with Guaranteed Seat Reservation",
    badge: "Live Arena",
    badgeColor: "bg-amber-400 text-black font-extrabold",
    startingPrice: "₹250",
  };
}
