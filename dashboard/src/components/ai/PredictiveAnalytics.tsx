'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { predictBotChurn, predictAttackSuccess, suggestOptimalTime } from '@/lib/aiAnalytics';

export function PredictiveAnalytics() {
  const [predictions, setPredictions] = useState({
    botChurn: { rate: 0, risk: 'low', factors: [] as string[] },
    attackSuccess: { probability: 0, confidence: 0, recommendations: [] as string[] },
    optimalTime: { timestamp: new Date(), score: 0, reasoning: '' },
  });
  const [isLoading, setIsLoading] = useState(false);

  const runPredictions = async () => {
    setIsLoading(true);
    try {
      const [churn, success, timing] = await Promise.all([
        predictBotChurn(),
        predictAttackSuccess(),
        suggestOptimalTime(),
      ]);

      setPredictions({
        botChurn: churn,
        attackSuccess: success,
        optimalTime: timing,
      });
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runPredictions();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">AI-Powered Predictions</h2>
          <p className="text-sm text-text-muted mt-1">
            Machine learning insights for optimal performance
          </p>
        </div>
        <Button
          variant="primary"
          onClick={runPredictions}
          isLoading={isLoading}
        >
          Refresh Predictions
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bot Churn Prediction */}
        <Card variant="bordered" glow>
          <CardHeader>
            <CardTitle>Bot Churn Prediction</CardTitle>
            <CardDescription>Likelihood of bot loss in next 24h</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className={`text-5xl font-bold ${
                predictions.botChurn.risk === 'high' ? 'text-accent-danger' :
                predictions.botChurn.risk === 'medium' ? 'text-accent-warning' :
                'text-accent-primary'
              }`}>
                {predictions.botChurn.rate}%
              </div>
              <div className="text-sm text-text-muted mt-2 capitalize">
                {predictions.botChurn.risk} Risk
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-text-secondary">Risk Factors</h4>
              {predictions.botChurn.factors.map((factor, idx) => (
                <div key={idx} className="text-xs text-text-muted flex items-start space-x-2">
                  <span className="text-accent-warning">•</span>
                  <span>{factor}</span>
                </div>
              ))}
            </div>

            <div className="glass-card p-3 rounded-lg">
              <div className="text-xs text-text-muted mb-2">Recommendation</div>
              <div className="text-sm text-text-primary">
                {predictions.botChurn.risk === 'high' 
                  ? 'Increase bot recruitment efforts immediately'
                  : 'Monitor bot health and maintain current strategies'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attack Success Prediction */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Attack Success Rate</CardTitle>
            <CardDescription>Predicted success for next attack</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-accent-primary">
                {Math.round(predictions.attackSuccess.probability * 100)}%
              </div>
              <div className="text-sm text-text-muted mt-2">
                Confidence: {Math.round(predictions.attackSuccess.confidence * 100)}%
              </div>
            </div>

            {/* Confidence Bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Confidence Level</span>
                <span>{Math.round(predictions.attackSuccess.confidence * 100)}%</span>
              </div>
              <div className="h-2 bg-primary-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary rounded-full transition-all"
                  style={{ width: `${predictions.attackSuccess.confidence * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-text-secondary">Recommendations</h4>
              {predictions.attackSuccess.recommendations.map((rec, idx) => (
                <div key={idx} className="text-xs text-text-muted flex items-start space-x-2">
                  <span className="text-accent-primary">✓</span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Optimal Attack Time */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Optimal Attack Time</CardTitle>
            <CardDescription>Best time for maximum impact</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-warning">
                {predictions.optimalTime.timestamp.toLocaleTimeString()}
              </div>
              <div className="text-sm text-text-muted mt-1">
                {predictions.optimalTime.timestamp.toLocaleDateString()}
              </div>
              <div className="text-xs text-text-muted mt-2">
                Optimization Score: {predictions.optimalTime.score}/100
              </div>
            </div>

            {/* Score visualization */}
            <div className="relative h-20">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-2 bg-primary-bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-danger via-accent-warning to-accent-primary rounded-full transition-all"
                    style={{ width: `${predictions.optimalTime.score}%` }}
                  />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="glass-card px-3 py-1 rounded-full">
                  <span className="text-xs font-mono text-text-primary">
                    {predictions.optimalTime.score}%
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card p-3 rounded-lg">
              <div className="text-xs text-text-muted mb-1">Analysis</div>
              <div className="text-sm text-text-primary">
                {predictions.optimalTime.reasoning}
              </div>
            </div>

            <Button variant="primary" className="w-full" size="sm">
              Schedule for Optimal Time
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Detection */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Anomaly Detection</CardTitle>
          <CardDescription>AI-detected unusual patterns in system behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { severity: 'high', type: 'Traffic Pattern', message: 'Unusual spike in bot traffic detected at 03:42 UTC', timestamp: '2 hours ago' },
              { severity: 'medium', type: 'Resource Usage', message: 'Memory consumption 23% above baseline', timestamp: '4 hours ago' },
              { severity: 'low', type: 'Connection', message: 'New geographic region detected: Eastern Europe', timestamp: '6 hours ago' },
            ].map((anomaly, idx) => (
              <div key={idx} className={`p-4 rounded-lg border ${
                anomaly.severity === 'high' ? 'border-accent-danger/50 bg-accent-danger/10' :
                anomaly.severity === 'medium' ? 'border-accent-warning/50 bg-accent-warning/10' :
                'border-accent-primary/50 bg-accent-primary/10'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        anomaly.severity === 'high' ? 'bg-accent-danger/20 text-accent-danger' :
                        anomaly.severity === 'medium' ? 'bg-accent-warning/20 text-accent-warning' :
                        'bg-accent-primary/20 text-accent-primary'
                      }`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-text-primary">{anomaly.type}</span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">{anomaly.message}</p>
                    <div className="text-xs text-text-muted mt-2">{anomaly.timestamp}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
