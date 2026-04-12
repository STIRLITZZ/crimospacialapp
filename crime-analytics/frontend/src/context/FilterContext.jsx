import { createContext, useContext, useState, useEffect } from "react";
import { fetchAreas, fetchCrimeTypes, fetchDateRange } from "../services/api";

const FilterContext = createContext();

export function FilterProvider({ children }) {
  // Global filter state
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCrimeType, setSelectedCrimeType] = useState("");
  const [yearRange, setYearRange] = useState({ from: null, to: null });

  // Options loaded from API
  const [areas, setAreas] = useState([]);
  const [crimeTypes, setCrimeTypes] = useState([]);
  const [dateRange, setDateRange] = useState({ min: null, max: null });

  useEffect(() => {
    fetchAreas().then(setAreas).catch(() => {});
    fetchCrimeTypes().then(setCrimeTypes).catch(() => {});
    fetchDateRange()
      .then((d) => {
        const minYear = d.min_date ? new Date(d.min_date).getFullYear() : 2020;
        const maxYear = d.max_date ? new Date(d.max_date).getFullYear() : 2024;
        setDateRange({ min: minYear, max: maxYear });
        setYearRange({ from: minYear, to: maxYear });
      })
      .catch(() => {});
  }, []);

  /** Build a query-param object from current filters. */
  function buildFilterParams() {
    const params = {};
    if (selectedArea) params.area_name = selectedArea;
    if (selectedCrimeType) params.crm_cd_desc = selectedCrimeType;
    if (yearRange.from) params.year_from = yearRange.from;
    if (yearRange.to) params.year_to = yearRange.to;
    return params;
  }

  return (
    <FilterContext.Provider
      value={{
        selectedArea,
        setSelectedArea,
        selectedCrimeType,
        setSelectedCrimeType,
        yearRange,
        setYearRange,
        areas,
        crimeTypes,
        dateRange,
        buildFilterParams,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  return useContext(FilterContext);
}
