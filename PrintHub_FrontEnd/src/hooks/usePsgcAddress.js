import { useState, useEffect } from "react";

export function usePsgcAddress() {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [activeCodes, setActiveCodes] = useState({
    region: "",
    province: "",
    city: "",
  });

  const fetchRegions = async () => {
    const res = await fetch("https://psgc.gitlab.io/api/regions/");
    return await res.json();
  };

  const fetchProvinces = async (regionCode) => {
    if (!regionCode) return [];
    const res = await fetch(
      `https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`
    );
    return await res.json();
  };

  const fetchCities = async (parentCode, hasProvinces) => {
    if (!parentCode) return [];
    const url = hasProvinces
      ? `https://psgc.gitlab.io/api/provinces/${parentCode}/cities-municipalities/`
      : `https://psgc.gitlab.io/api/regions/${parentCode}/cities-municipalities/`;
    const res = await fetch(url);
    return await res.json();
  };

  const fetchBarangays = async (cityCode) => {
    if (!cityCode) return [];
    const res = await fetch(
      `https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`
    );
    return await res.json();
  };

  const findMatch = (list, name) => {
    if (!name || !list) return null;
    const cleanName = name
      .toLowerCase()
      .replace(/city of|city|province of|province/g, "")
      .trim();
    return list.find((item) => {
      const itemCleanName = item.name
        .toLowerCase()
        .replace(/city of|city|province of|province/g, "")
        .trim();
      const itemCleanRegion = (item.regionName || "")
        .toLowerCase()
        .replace(/city of|city/g, "")
        .trim();
      return (
        itemCleanName === cleanName ||
        itemCleanRegion === cleanName ||
        item.name.toLowerCase() === name.toLowerCase()
      );
    });
  };

  useEffect(() => {
    let cancelled = false;
    const loadInit = async () => {
      try {
        const data = await fetchRegions();
        if (!cancelled) setRegions(data);
      } catch (err) {
        console.error("Failed to load regions:", err);
      }
    };
    loadInit();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRegionChange = async (regionName, onSelect) => {
    const matchedRegion = regions.find((r) => r.name === regionName);
    const rCode = matchedRegion ? matchedRegion.code : "";

    setProvinces([]);
    setCities([]);
    setBarangays([]);
    setActiveCodes({ region: rCode, province: "", city: "" });

    onSelect?.({
      region: regionName,
      province: "",
      city: "",
      barangay: "",
    });

    if (!rCode) return;
    try {
      const provincesData = await fetchProvinces(rCode);
      setProvinces(provincesData);
      if (provincesData.length === 0) {
        onSelect?.({
          region: regionName,
          province: "N/A",
          city: "",
          barangay: "",
        });
        const citiesData = await fetchCities(rCode, false);
        setCities(citiesData);
      }
    } catch (err) {
      console.error("Failed to fetch provinces/cities:", err);
    }
  };

  const handleProvinceChange = async (provinceName, onSelect) => {
    const matchedProvince = provinces.find((p) => p.name === provinceName);
    const pCode = matchedProvince ? matchedProvince.code : "";

    setCities([]);
    setBarangays([]);
    setActiveCodes((prev) => ({ ...prev, province: pCode, city: "" }));

    onSelect?.({
      province: provinceName,
      city: "",
      barangay: "",
    });

    if (!pCode) return;
    try {
      const citiesData = await fetchCities(pCode, true);
      setCities(citiesData);
    } catch (err) {
      console.error("Failed to fetch cities:", err);
    }
  };

  const handleCityChange = async (cityName, onSelect) => {
    const matchedCity = cities.find((c) => c.name === cityName);
    const cCode = matchedCity ? matchedCity.code : "";

    setBarangays([]);
    setActiveCodes((prev) => ({ ...prev, city: cCode }));

    onSelect?.({
      city: cityName,
      barangay: "",
    });

    if (!cCode) return;
    try {
      const barangaysData = await fetchBarangays(cCode);
      setBarangays(barangaysData);
    } catch (err) {
      console.error("Failed to fetch barangays:", err);
    }
  };

  const setAddressLists = (provincesList, citiesList, barangaysList) => {
    setProvinces(provincesList);
    setCities(citiesList);
    setBarangays(barangaysList);
  };

  const loadSavedAddressSequentially = async (
    savedRegion,
    savedProvince,
    savedCity,
    savedBarangay
  ) => {
    try {
      let currentRegions = regions;
      if (currentRegions.length === 0) {
        currentRegions = await fetchRegions();
        setRegions(currentRegions);
      }

      const matchedRegion = findMatch(currentRegions, savedRegion);
      if (!matchedRegion) return null;

      const rCode = matchedRegion.code;
      const provincesData = await fetchProvinces(rCode);

      let matchedProvince = null;
      let pCode = "";
      let citiesData = [];

      if (provincesData.length > 0) {
        setProvinces(provincesData);
        matchedProvince = findMatch(provincesData, savedProvince);
        if (matchedProvince) {
          pCode = matchedProvince.code;
          citiesData = await fetchCities(pCode, true);
        }
      } else {
        setProvinces([]);
        citiesData = await fetchCities(rCode, false);
      }

      let matchedCity = null;
      let cCode = "";
      let barangaysData = [];

      if (citiesData.length > 0) {
        setCities(citiesData);
        matchedCity = findMatch(citiesData, savedCity);
        if (matchedCity) {
          cCode = matchedCity.code;
          barangaysData = await fetchBarangays(cCode);
        }
      } else {
        setCities([]);
      }

      if (barangaysData.length > 0) {
        setBarangays(barangaysData);
      } else {
        setBarangays([]);
      }

      const matchedBrgy = findMatch(barangaysData, savedBarangay);

      setActiveCodes({
        region: rCode,
        province: pCode,
        city: cCode,
      });

      return {
        region: matchedRegion.name,
        province: matchedProvince
          ? matchedProvince.name
          : provincesData.length > 0
          ? ""
          : "N/A",
        city: matchedCity ? matchedCity.name : "",
        barangay: matchedBrgy ? matchedBrgy.name : savedBarangay,
        provincesData,
        citiesData,
        barangaysData,
      };
    } catch (err) {
      console.error("Failed to load saved address in hook:", err);
      return null;
    }
  };

  return {
    regions,
    provinces,
    cities,
    barangays,
    activeCodes,
    handleRegionChange,
    handleProvinceChange,
    handleCityChange,
    loadSavedAddressSequentially,
    setAddressLists,
    setActiveCodes,
  };
}
