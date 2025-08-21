import { IPetState } from '../core/Pet';
import { PET_CONFIG } from '../core/config';

export class StatusBarFormatter {
  constructor() {
    // No dependencies needed for CLI formatter
  }

  public formatPetDisplay(state: IPetState): string {
    try {
      const energyBar = this.generateEnergyBar(state.energy);
      return `${state.expression} ${energyBar}`;
    } catch (error) {
      console.error('Failed to format pet display:', error);
      return '(?) ERROR';
    }
  }

  public generateEnergyBar(energy: number): string {
    try {
      if (isNaN(energy)) {
        return '??????????';
      }
      
      const clampedEnergy = Math.max(0, Math.min(100, energy));
      const filledBars = Math.floor((clampedEnergy / 100) * PET_CONFIG.ENERGY_BAR_LENGTH);
      const emptyBars = PET_CONFIG.ENERGY_BAR_LENGTH - filledBars;
      
      return (
        PET_CONFIG.FILLED_BAR_CHAR.repeat(filledBars) +
        PET_CONFIG.EMPTY_BAR_CHAR.repeat(emptyBars)
      );
    } catch (error) {
      console.error('Failed to generate energy bar:', error);
      return '??????????';
    }
  }

}