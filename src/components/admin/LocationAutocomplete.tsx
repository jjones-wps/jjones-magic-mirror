'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * LocationAutocomplete Component
 *
 * A reusable autocomplete component for searching locations via TomTom Search API.
 * Features:
 * - Debounced search (300ms)
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Click outside to close
 * - ARIA accessibility support
 * - Memory leak prevention (cleanup on unmount)
 */

interface LocationAutocompleteProps {
  value: string;
  onSelect: (result: { address: string; lat: number; lon: number }) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface SearchResult {
  address: string;
  lat: number;
  lon: number;
}

export default function LocationAutocomplete({
  value,
  onSelect,
  placeholder = 'Search for a location...',
  disabled = false,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState<string>(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const justSelectedRef = useRef<boolean>(false);

  /**
   * Sync query state with prop value
   */
  useEffect(() => {
    setQuery(value);
  }, [value]);

  /**
   * Debounced search effect (300ms delay)
   * - Waits for user to stop typing
   * - Cancels previous API calls
   * - Validates query length (minimum 2 characters)
   * - Skips search if user just selected a result
   */
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Skip search if we just selected a result
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    // Reset results if query too short
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }

    // Debounce: Wait 300ms after user stops typing
    debounceTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    // Cleanup: Clear timeout on unmount or query change
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query]);

  /**
   * Click-outside detection
   * Closes dropdown when clicking outside the component
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup: Remove event listener on unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Cleanup: Cancel pending API calls on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Perform geocoding search via backend API
   * - Cancels previous requests
   * - Handles loading/error states
   * - Updates results on success
   */
  async function performSearch(searchQuery: string) {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/geocode/search?q=${encodeURIComponent(searchQuery)}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
      setIsOpen(true);
    } catch (err) {
      // Ignore AbortError (expected when canceling requests)
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Search failed, please try again');
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle keyboard navigation
   * - Arrow Down: Move to next result (wrap to first)
   * - Arrow Up: Move to previous result (wrap to last)
   * - Enter: Select highlighted result
   * - Escape: Close dropdown
   */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }

  /**
   * Handle result selection
   * - Sets flag to prevent search re-trigger
   * - Updates query with selected address
   * - Calls onSelect callback with address and coordinates
   * - Closes dropdown
   * - Resets selection
   */
  function handleSelect(result: SearchResult) {
    justSelectedRef.current = true; // Prevent search from re-triggering
    setQuery(result.address); // Set query to selected address
    onSelect(result);
    setIsOpen(false);
    setSelectedIndex(-1);
  }

  /**
   * Handle input change
   * - Updates query state
   * - Resets selection (UX: clear selection when typing after selecting)
   */
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setSelectedIndex(-1); // Clear selection when typing
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Input Field */}
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={isOpen}
        aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls="autocomplete-results"
        style={{
          width: '100%',
          padding: 'var(--space-sm)',
          background: 'var(--admin-input-bg)',
          border: `1px solid ${error ? 'var(--admin-error)' : 'var(--admin-border)'}`,
          borderRadius: 'var(--radius-md)',
          color: 'var(--admin-text-primary)',
          fontSize: 'var(--font-size-base)',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.5 : 1,
        }}
      />

      {/* Loading Indicator */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            right: 'var(--space-sm)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--admin-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          Searching...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--admin-error)',
            marginTop: 'var(--space-xs)',
          }}
        >
          {error}
        </p>
      )}

      {/* ARIA Live Region for Screen Readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        {isOpen && results.length > 0 && `${results.length} results found`}
        {isOpen && results.length === 0 && !loading && 'No results found'}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <ul
          id="autocomplete-results"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + var(--space-xs))',
            left: 0,
            right: 0,
            maxHeight: '240px',
            overflowY: 'auto',
            background: '#1a1a1a', // Fully opaque dark background
            border: '1px solid var(--admin-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            margin: 0,
            padding: 'var(--space-xs)',
            listStyle: 'none',
          }}
        >
          {results.length === 0 && !loading ? (
            <li
              style={{
                padding: 'var(--space-md)',
                color: 'var(--admin-text-tertiary)',
                textAlign: 'center',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              No results found
            </li>
          ) : (
            results.map((result, index) => (
              <li
                key={index}
                id={`result-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: 'var(--space-sm)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)',
                  background:
                    index === selectedIndex ? 'var(--admin-primary-hover)' : 'transparent',
                  color: 'var(--admin-text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ fontWeight: 500 }}>{result.address}</div>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--admin-text-tertiary)',
                    marginTop: 'var(--space-xs)',
                  }}
                >
                  {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
