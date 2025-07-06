import { ModuleName } from '../types';
import { isModuleEnabled, areModuleDependenciesMet } from '../../config/modules';

// Type for module components
export interface ModuleComponent {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

// Module registry for dynamic loading
class ModuleRegistry {
  private modules = new Map<ModuleName, any>();
  private components = new Map<string, React.ComponentType<any>>();
  
  registerModule(name: ModuleName, module: any) {
    if (!isModuleEnabled(name)) {
      console.warn(`Module ${name} is not enabled, skipping registration`);
      return;
    }
    
    if (!areModuleDependenciesMet(name)) {
      console.warn(`Module ${name} dependencies not met, skipping registration`);
      return;
    }
    
    this.modules.set(name, module);
    console.log(`Module ${name} registered successfully`);
  }
  
  getModule(name: ModuleName) {
    return this.modules.get(name);
  }
  
  isModuleRegistered(name: ModuleName): boolean {
    return this.modules.has(name);
  }
  
  registerComponent(name: string, component: React.ComponentType<any>) {
    this.components.set(name, component);
  }
  
  getComponent(name: string) {
    return this.components.get(name);
  }
  
  getEnabledModules(): ModuleName[] {
    return Array.from(this.modules.keys());
  }
}

export const moduleRegistry = new ModuleRegistry();

// React hook for conditional module rendering
export function useModule(moduleName: ModuleName) {
  return {
    isEnabled: isModuleEnabled(moduleName),
    isRegistered: moduleRegistry.isModuleRegistered(moduleName),
    module: moduleRegistry.getModule(moduleName),
  };
}

// HOC for conditional feature rendering
export function withModuleCheck<P extends object>(
  moduleName: ModuleName,
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function ModuleWrapper(props: P) {
    const { isEnabled } = useModule(moduleName);
    
    if (!isEnabled) {
      return null;
    }
    
    return <Component {...props} />;
  };
}

// Component for conditional rendering based on module
export function ConditionalFeature({ 
  module, 
  children 
}: { 
  module: ModuleName; 
  children: React.ReactNode; 
}) {
  const { isEnabled } = useModule(module);
  return isEnabled ? <>{children}</> : null;
}