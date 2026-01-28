"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Recycle, 
  Calculator, 
  Trophy, 
  Wallet, 
  TreePine, 
  Leaf,
  TrendingUp,
  Award,
  Zap
} from "lucide-react";
import {
  MaterialType,
  calculateTransactionTotals,
  validateTransactionLimits,
  getMaterialPricing,
  getAchievement,
  formatCurrency,
  formatWeight,
  formatPoints,
  defaultMaterialPricing,
  defaultAutoCalculatorConfig,
} from "@/lib/recycling-schema";

interface MaterialInput {
  type: MaterialType;
  kg: number;
}

interface CalculatorState {
  materials: MaterialInput[];
  userAchievements: string[];
  userStreak: number;
  hasReferrals: boolean;
  dailyStats: {
    kg: number;
    transactions: number;
    points: number;
  };
}

export function RecyclingCalculator() {
  const [state, setState] = useState<CalculatorState>({
    materials: [],
    userAchievements: ['BRONZE_RECYCLER'],
    userStreak: 3,
    hasReferrals: false,
    dailyStats: {
      kg: 25,
      transactions: 2,
      points: 180,
    },
  });

  const [newMaterial, setNewMaterial] = useState<MaterialInput>({
    type: 'PET',
    kg: 0,
  });

  // Calculate totals whenever materials change
  const calculation = calculateTransactionTotals(
    state.materials,
    defaultAutoCalculatorConfig,
    state.userAchievements as any,
    state.userStreak,
    state.hasReferrals
  );

  // Validate transaction limits
  const validation = validateTransactionLimits(
    'user-123',
    calculation.totalKg,
    state.dailyStats,
    defaultAutoCalculatorConfig
  );

  const handleAddMaterial = () => {
    if (newMaterial.kg > 0) {
      setState(prev => ({
        ...prev,
        materials: [...prev.materials, { ...newMaterial }],
      }));
      setNewMaterial({ type: 'PET', kg: 0 });
    }
  };

  const handleRemoveMaterial = (index: number) => {
    setState(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const handleClearAll = () => {
    setState(prev => ({
      ...prev,
      materials: [],
    }));
  };

  const getCurrentAchievement = () => {
    return getAchievement(calculation.achievementProgress.current);
  };

  const getNextAchievement = () => {
    if (calculation.achievementProgress.next) {
      return getAchievement(calculation.achievementProgress.next);
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Calculator className="h-8 w-8 text-primary" />
          Recycling Auto-Calculator
        </h1>
        <p className="text-muted-foreground mt-2">
          Input your materials and see automatic calculations for points, funds, and achievements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Material Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Recycle className="h-5 w-5 text-success" />
                Add Materials
              </CardTitle>
              <CardDescription>
                Select material type and enter weight in kilograms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="materialType">Material Type</Label>
                  <Select
                    value={newMaterial.type}
                    onValueChange={(value: MaterialType) =>
                      setNewMaterial(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultMaterialPricing.map((material) => (
                        <SelectItem key={material.id} value={material.type}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={newMaterial.kg}
                    onChange={(e) =>
                      setNewMaterial(prev => ({ ...prev, kg: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="0.0"
                  />
                </div>
              </div>
              <Button onClick={handleAddMaterial} disabled={newMaterial.kg <= 0}>
                <Recycle className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </CardContent>
          </Card>

          {/* Current Materials List */}
          {state.materials.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Current Materials</CardTitle>
                  <Button variant="outline" onClick={handleClearAll} size="sm">
                    Clear All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {state.materials.map((material, index) => {
                    const pricing = getMaterialPricing(material.type);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                            <Recycle className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <div className="font-medium">{pricing?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatWeight(material.kg)} • {formatCurrency(material.kg * (pricing?.pricePerKg || 0))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {formatPoints(material.kg * (pricing?.pointsPerKg || 0))}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMaterial(index)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {/* Transaction Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Transaction Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 rounded-lg bg-primary/10">
                  <div className="text-2xl font-bold text-primary">
                    {formatWeight(calculation.totalKg)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Weight</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10">
                  <div className="text-2xl font-bold text-success">
                    {formatCurrency(calculation.totalPrice)}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-accent/10">
                <div className="text-2xl font-bold text-accent text-center">
                  {formatPoints(calculation.totalPoints)}
                </div>
                <p className="text-sm text-muted-foreground text-center">Points Earned</p>
              </div>

              {/* Validation Errors */}
              {!validation.isValid && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-sm text-destructive font-medium mb-2">⚠️ Transaction Limits</div>
                  <ul className="text-xs text-destructive space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fund Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-success" />
                Fund Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Personal Wallet</span>
                <span className="font-medium">{formatCurrency(calculation.fundAllocation.wallet)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Green Scholar Fund</span>
                <span className="font-medium">{formatCurrency(calculation.fundAllocation.greenScholar)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Environmental Projects</span>
                <span className="font-medium">{formatCurrency(calculation.fundAllocation.environmentalProjects)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Environmental Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                Environmental Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CO₂ Saved</span>
                <span className="font-medium">{calculation.totalCo2Saved.toFixed(1)} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Water Saved</span>
                <span className="font-medium">{formatWeight(calculation.totalWaterSaved)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Landfill Saved</span>
                <span className="font-medium">{formatWeight(calculation.totalLandfillSaved)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Achievement Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Achievement Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Achievement */}
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {getCurrentAchievement()?.icon}
                </div>
                <div className="font-medium">{getCurrentAchievement()?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {getCurrentAchievement()?.description}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to next level</span>
                  <span>{Math.round(calculation.achievementProgress.progress * 100)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculation.achievementProgress.progress * 100}%` }}
                  />
                </div>
              </div>

              {/* Next Achievement */}
              {getNextAchievement() && (
                <div className="text-center p-3 rounded-lg bg-accent/10">
                  <div className="text-sm text-muted-foreground mb-1">Next: {getNextAchievement()?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getNextAchievement()?.requiredPoints} points • {getNextAchievement()?.requiredKg} kg
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Daily Streak</span>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{state.userStreak} days</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Today's Total</span>
                <span className="font-medium">{formatWeight(state.dailyStats.kg)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Today's Points</span>
                <span className="font-medium">{formatPoints(state.dailyStats.points)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Transactions</span>
                <span className="font-medium">{state.dailyStats.transactions}/10</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      {state.materials.length > 0 && (
        <div className="flex justify-center gap-4">
          <Button size="lg" className="bg-success hover:bg-success/90">
            <Recycle className="h-5 w-5 mr-2" />
            Process Collection
          </Button>
          <Button variant="outline" size="lg" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
