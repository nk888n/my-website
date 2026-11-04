export const business = {
  name: "VALE BEAUTY VK",
  email: "vale.beauty.vk@gmail.com",
  phone: "(519) 980-7121",
  address: "3875 Tecumseh Rd E, Unit 2, Windsor, ON N8W 1J1",
  hours: "8:00 AM – 7:00 PM, every day",
  timezone: process.env.BUSINESS_TIMEZONE || "America/Toronto",
};

export const facialTreatments = [
  { id:"customized-facial", name:"Deep Cleansing Facial", duration:60, price:70, tagline:"For All Skin Types", description:"Fully personalized facial tailored to unique skin needs. Customize every step from deep cleansing to treatment selection to help achieve healthy, glowing, balanced skin.", skinTypes:["Oily","Acne-Prone","Combination","Dry","Sensitive","Hydration","Brightening","Anti-Aging"], includes:["Deep cleansing to remove impurities","Exfoliation (if needed)","Extractions (if needed)","Customized mask & treatment","Hydration & nourishment","Leaves skin refreshed, radiant & balanced"], free:["Face Massage — FREE","FREE device used according to skin: Ultrasonic, LED Light, High Frequency, or Ice Globes"], image:"/services/Customized-Facial.jpeg" },
  { id:"dermaplaning-facial", name:"Dermaplaning Facial", duration:60, price:80, tagline:"Smooth. Glow. Renew.", description:"Dermaplaning is a gentle exfoliation treatment that removes dead skin cells and fine facial hair, leaving the skin smoother, brighter, and more radiant.", includes:["Removes dead skin & peach fuzz","Instantly smoother & brighter skin","Improves texture & product absorption","Does not change hair growth","Best results with consistent care"], free:["Hydrating Mask — FREE","LED Light Therapy according to your skin"], image:"/services/Dermaplaning-Facial.jpeg" },
  { id:"bridal-glow-package", name:"Bridal Glow Package", duration:90, price:100, tagline:"For Your Most Beautiful Day", description:"A complete pre-bridal skin care experience to make you glow with confidence.", includes:["Customized Facial","Deep cleansing to remove impurities","Exfoliation (if needed)","Extractions (if needed)","Customized mask & treatment","Hydration & nourishment","Leaves skin refreshed, radiant & balanced","Hydrating Mask","LED Therapy","Face & Neck Massage","High Frequency","Ice Globe Massage","Full Relaxation Time"], free:["Special Free Gifts: LED Therapy","High Frequency"], image:"/services/Bridal-Glow-Package.jpeg" },
  {id:"your-self-care-choice",name:"Facial + Your Self-Care Choice",duration:60,price:75,description:"",includes:["Deep cleansing to remove impurities","Exfoliation (if needed)","Extractions (if needed)","Customized mask & treatment","Hydration & nourishment","Leaves skin refreshed, radiant & balanced","Choose ONE:","Legs Massage","Hands Massage","High Frequency Comb"],image:"/services/Full-Body-Relaxation-Massage.jpeg"},
];

export const facialAddons = [
  {id:"dermaplaning-addon",name:"Dermaplaning",price:30},
  {id:"led-therapy",name:"LED Therapy",price:10},
  {id:"high-frequency-full",name:"High Frequency (Full Treatment)",price:10},
  {id:"ice-globe-massage",name:"Ice Globe Massage",price:10},
  {id:"hot-stone-facial-massage",name:"Hot Stone Facial Massage",price:10},
  {id:"ultrasonic-deep-infusion",name:"Ultrasonic Deep Infusion",price:10},
  {id:"extended-face-neck-massage",name:"Extended Face & Neck Massage",price:10}
];

export const bodyTreatments = [
  {id:"full-body-relaxation-massage",name:"Full Body Relaxation Massage",duration:90,price:95,includes:["Scalp massage","Neck & shoulder release","Back massage","Arm & hand massage","Legs & feet massage","Abdominal Massage","Warm towel","Hot stone"],image:"/services/Full-Body-Relaxation-Massage.jpeg"},
  {id:"relaxation-back-massage",name:"Back Massage",duration:35,price:70,description:"A soothing massage that targets the back, neck and shoulders to release muscle tension and reduce stress.",includes:["Swedish relaxation techniques","Relieves tension & stiffness","Improves circulation","Warm towel","Hot stone"],image:"/services/Relaxation-Back-Massage.jpeg"},
  {id:"indian-head-scalp-massage",name:"Indian Head & Scalp Massage",duration:30,price:50,description:"Focuses on pressure points on the head, neck and shoulders to relieve tension, headaches and stress.",includes:["Scalp massage","Neck & shoulder release","Improves sleep & mental clarity","Boosts circulation"],image:"/services/Indian-Head-Scalp-Massage.jpeg"},
  {id:"purifying-back-treatment",name:"Back Treatment with Massage",duration:60,price:80,description:"Deep cleansing treatment for your back to purify, exfoliate and hydrate the skin.",includes:["Deep cleanse & steam","Exfoliation","Extractions (if needed)","Relaxing back massage","Customize mask","Moisturizer"],image:"/services/Purifying-Back-Treatment.jpeg"},
  {id:"dry-brushing-body-polish",name:"Dry Brushing & Body Polish",duration:90,price:100,description:"Exfoliating treatment that buffs away dead skin cells, stimulates circulation and leaves skin smooth and glowing.",includes:["Dry brushing","Full body exfoliation","Improves skin texture","Hydrating body lotion"],image:"/services/Dry-Brushing-Body-Polish.jpeg"}
];

export const bodyAddons = [
  {id:"hot-stone-enhancement",name:"Hot Stone Enhancement",price:15,blurb:"Adds deep relaxation and melts away muscle tension."},
  {id:"scalp-massage",name:"Scalp Massage",price:15,blurb:"Relieves tension in the scalp, improves circulation and promotes relaxation."},
  {id:"dry-brushing",name:"Dry Brushing",price:15,blurb:"Boosts circulation and supports lymphatic drainage."},
  {id:"exfoliation-boost",name:"Exfoliation Boost",price:15,blurb:"Removes dead skin cells for smoother, brighter skin."},
  {id:"aromatherapy",name:"Aromatherapy",price:10,blurb:"Essential oils to relax the mind, calm the body and uplift your mood."},
  {id:"moisture-boost",name:"Moisture Boost",price:10,blurb:"Intense hydration to leave your skin soft, smooth and radiant."}
];

export const eyebrow = {id:"eyebrow-threading",name:"Eyebrow Threading",duration:30,price:10,description:"A standalone eyebrow threading service.",image:"/services/Eyebrow-Threading.jpeg"};

export const allServices = [...facialTreatments,...bodyTreatments,eyebrow];
export const facialAddonIds = facialAddons.map(a=>a.id);
export const bodyAddonIds = bodyAddons.map(a=>a.id);

export function findService(id){ return allServices.find(s=>s.id===id); }
export function findAddon(id){ return [...facialAddons,...bodyAddons].find(a=>a.id===id); }
