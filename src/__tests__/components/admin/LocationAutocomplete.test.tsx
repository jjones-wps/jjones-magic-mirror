import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LocationAutocomplete from '@/components/admin/LocationAutocomplete';

// Mock global fetch
global.fetch = jest.fn();

describe('LocationAutocomplete', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render with placeholder', () => {
      render(
        <LocationAutocomplete value="" onSelect={mockOnSelect} placeholder="Search location..." />
      );
      expect(screen.getByPlaceholderText('Search location...')).toBeInTheDocument();
    });

    it('should render with initial value', () => {
      render(<LocationAutocomplete value="Fort Wayne, IN" onSelect={mockOnSelect} />);
      expect(screen.getByDisplayValue('Fort Wayne, IN')).toBeInTheDocument();
    });

    it('should render as disabled when disabled prop is true', () => {
      render(<LocationAutocomplete value="" onSelect={mockOnSelect} disabled={true} />);
      const input = screen.getByRole('combobox');
      expect(input).toBeDisabled();
    });

    it('should have correct ARIA attributes', () => {
      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('aria-controls', 'autocomplete-results');
    });
  });

  describe('Debouncing', () => {
    it('should debounce API calls for 300ms', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      // Type quickly (simulate user typing)
      fireEvent.change(input, { target: { value: 'f' } });
      fireEvent.change(input, { target: { value: 'fo' } });
      fireEvent.change(input, { target: { value: 'for' } });

      // Should not call immediately
      expect(global.fetch).not.toHaveBeenCalled();

      // Fast-forward 299ms (just before debounce completes)
      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(global.fetch).not.toHaveBeenCalled();

      // Fast-forward 1ms more (300ms total)
      act(() => {
        jest.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });

    it('should not search for queries less than 2 characters', async () => {
      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'a' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should search for queries with exactly 2 characters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'ab' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Search Results', () => {
    it('should display search results', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { address: 'Fort Wayne, IN 46802', lat: 41.0793, lon: -85.1394 },
            { address: 'Fort Wayne, IN 46803', lat: 41.0845, lon: -85.1402 },
          ],
        }),
      });

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'fort wayne' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Fort Wayne, IN 46802')).toBeInTheDocument();
        expect(screen.getByText('Fort Wayne, IN 46803')).toBeInTheDocument();
      });
    });

    it('should show "No results found" when no results', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'zzzzz' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Check for visible "No results found" in the dropdown list
        const listbox = screen.getByRole('listbox');
        expect(listbox).toHaveTextContent('No results found');
      });
    });

    it('should show loading indicator while searching', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: async () => ({ results: [] }) }), 100)
          )
      );

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { address: 'Result 1', lat: 41, lon: -85 },
            { address: 'Result 2', lat: 42, lon: -86 },
            { address: 'Result 3', lat: 43, lon: -87 },
          ],
        }),
      });
    });

    it('should navigate down with Arrow Down key', async () => {
      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      // Navigate down
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const firstOption = screen.getByText('Result 1').closest('li');
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    it('should navigate up with Arrow Up key', async () => {
      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      // Navigate down twice, then up once
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      const firstOption = screen.getByText('Result 1').closest('li');
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    it('should wrap to first when navigating down from last', async () => {
      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      // Navigate to last, then down (should wrap to first)
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // 0
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // 1
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // 2
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // wrap to 0

      const firstOption = screen.getByText('Result 1').closest('li');
      expect(firstOption).toHaveAttribute('aria-selected', 'true');
    });

    it('should select result with Enter key', async () => {
      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnSelect).toHaveBeenCalledWith({
        address: 'Result 1',
        lat: 41,
        lon: -85,
      });
    });

    it('should close dropdown with Escape key', async () => {
      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Result 1')).not.toBeInTheDocument();
      });
    });

    it('should clear selection when typing after selecting', async () => {
      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Result 1')).toBeInTheDocument();
      });

      // Select first result
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Type again (should clear selection)
      fireEvent.change(input, { target: { value: 'test2' } });

      // selectedIndex should be reset to -1
      const firstOption = screen.getByText('Result 1').closest('li');
      expect(firstOption).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Click Interaction', () => {
    it('should select result on click', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ address: 'Fort Wayne, IN', lat: 41.0793, lon: -85.1394 }],
        }),
      });

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'fort' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Fort Wayne, IN')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Fort Wayne, IN'));

      expect(mockOnSelect).toHaveBeenCalledWith({
        address: 'Fort Wayne, IN',
        lat: 41.0793,
        lon: -85.1394,
      });
    });

    it('should close dropdown after selection', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ address: 'Fort Wayne, IN', lat: 41.0793, lon: -85.1394 }],
        }),
      });

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'fort' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Fort Wayne, IN')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Fort Wayne, IN'));

      await waitFor(() => {
        expect(screen.queryByText('Fort Wayne, IN')).not.toBeInTheDocument();
      });
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ address: 'Fort Wayne, IN', lat: 41.0793, lon: -85.1394 }],
        }),
      });

      render(
        <div>
          <LocationAutocomplete value="" onSelect={mockOnSelect} />
          <button>Outside Button</button>
        </div>
      );
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'fort' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Fort Wayne, IN')).toBeInTheDocument();
      });

      // Click outside
      fireEvent.mouseDown(screen.getByText('Outside Button'));

      await waitFor(() => {
        expect(screen.queryByText('Fort Wayne, IN')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Search failed, please try again')).toBeInTheDocument();
      });
    });

    it('should display error message on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.getByText('Search failed, please try again')).toBeInTheDocument();
      });
    });

    it('should not show error for AbortError', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        expect(screen.queryByText('Search failed, please try again')).not.toBeInTheDocument();
      });
    });
  });

  describe('AbortController Cleanup', () => {
    it('should cancel pending request on unmount', async () => {
      const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: async () => ({ results: [] }) }), 1000)
          )
      );

      const { unmount } = render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      // Wait for fetch to start
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Unmount before request completes
      unmount();

      expect(abortSpy).toHaveBeenCalled();

      abortSpy.mockRestore();
    });
  });

  describe('ARIA Live Region', () => {
    it('should announce result count to screen readers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { address: 'Result 1', lat: 41, lon: -85 },
            { address: 'Result 2', lat: 42, lon: -86 },
          ],
        }),
      });

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'test' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent('2 results found');
      });
    });

    it('should announce no results to screen readers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ results: [] }),
      });

      render(<LocationAutocomplete value="" onSelect={mockOnSelect} />);
      const input = screen.getByRole('combobox');

      fireEvent.change(input, { target: { value: 'zzzzz' } });
      act(() => jest.advanceTimersByTime(300));

      await waitFor(() => {
        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveTextContent('No results found');
      });
    });
  });
});
