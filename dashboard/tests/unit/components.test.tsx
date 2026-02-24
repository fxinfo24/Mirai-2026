/**
 * Unit tests for UI components
 * Note: These are simple smoke tests. For full React component testing,
 * consider adding @testing-library/react
 */

describe('UI Components', () => {
  describe('Button', () => {
    test('Button module exports', () => {
      const Button = require('../../src/components/ui/Button');
      expect(Button.Button).toBeDefined();
    });
  });

  describe('Card', () => {
    test('Card module exports', () => {
      const Card = require('../../src/components/ui/Card');
      expect(Card.Card).toBeDefined();
      expect(Card.CardHeader).toBeDefined();
      expect(Card.CardTitle).toBeDefined();
      expect(Card.CardContent).toBeDefined();
    });
  });

  describe('Input', () => {
    test('Input module exports', () => {
      const Input = require('../../src/components/ui/Input');
      expect(Input.Input).toBeDefined();
    });
  });
});

describe('Dashboard Components', () => {
  describe('StatCard', () => {
    test('StatCard module exports', () => {
      const StatCard = require('../../src/components/dashboard/StatCard');
      expect(StatCard.StatCard).toBeDefined();
    });
  });
});

describe('Shared Components', () => {
  describe('Navbar', () => {
    test('Navbar module exports', () => {
      const Navbar = require('../../src/components/shared/Navbar');
      expect(Navbar.Navbar).toBeDefined();
    });
  });
});
