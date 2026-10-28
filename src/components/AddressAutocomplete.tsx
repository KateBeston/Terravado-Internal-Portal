"use client";
import { useEffect, useRef, useState } from "react";

/* Google Places address autocomplete — the "address identifier". As you type an
   Australian address it suggests matches and, on selection, captures the tidy
   formatted address plus coordinates, place id, suburb, state and postcode into
   hidden fields the form submits. With no key it is a plain address input, so
   the form still works. Restrict the key to the Maps JavaScript API (+ Places)
   by HTTP referrer in the Google Cloud console. */

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

let loaderPromise: Promise<void> | null = null;
function loadPlaces(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export default function AddressAutocomplete({
  name = "address", defaultValue = "", required, placeholder,
}: { name?: string; defaultValue?: string; required?: boolean; placeholder?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [geo, setGeo] = useState({ lat: "", lng: "", placeId: "", suburb: "", state: "", postcode: "" });

  useEffect(() => {
    if (!KEY || !inputRef.current) return;
    let ac: any;
    let cancelled = false;
    loadPlaces().then(() => {
      const g = (window as any).google;
      if (cancelled || !g?.maps?.places || !inputRef.current) return;
      ac = new g.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "au" },
        fields: ["formatted_address", "geometry", "place_id", "address_components"],
        types: ["address"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const comp = (type: string, short = false) => {
          const c = place.address_components?.find((x: any) => x.types.includes(type));
          return c ? (short ? c.short_name : c.long_name) : "";
        };
        setGeo({
          lat: place.geometry?.location ? String(place.geometry.location.lat()) : "",
          lng: place.geometry?.location ? String(place.geometry.location.lng()) : "",
          placeId: place.place_id ?? "",
          suburb: comp("locality") || comp("postal_town") || comp("sublocality"),
          state: comp("administrative_area_level_1", true),
          postcode: comp("postal_code"),
        });
        if (inputRef.current && place.formatted_address) inputRef.current.value = place.formatted_address;
      });
    }).catch(() => { /* fall back to plain input */ });
    return () => {
      cancelled = true;
      if (ac && (window as any).google) (window as any).google.maps.event.clearInstanceListeners(ac);
    };
  }, []);

  return (
    <>
      <input ref={inputRef} name={name} defaultValue={defaultValue} required={required}
        autoComplete="off" placeholder={placeholder ?? (KEY ? "Start typing an address…" : "Address")} />
      <input type="hidden" name="lat" value={geo.lat} readOnly />
      <input type="hidden" name="lng" value={geo.lng} readOnly />
      <input type="hidden" name="placeId" value={geo.placeId} readOnly />
      <input type="hidden" name="geoSuburb" value={geo.suburb} readOnly />
      <input type="hidden" name="geoState" value={geo.state} readOnly />
      <input type="hidden" name="geoPostcode" value={geo.postcode} readOnly />
    </>
  );
}
