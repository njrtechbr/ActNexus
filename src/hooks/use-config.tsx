
"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { getFullConfig, saveFullConfig, type AppConfig } from '@/services/apiClientLocal';

interface ConfigContextType {
    config: AppConfig | null;
    setConfig: (newConfig: AppConfig) => void;
    isConfigLoading: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfigState] = useState<AppConfig | null>(null);
    const [isConfigLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadConfig = async () => {
            setIsLoading(true);
            try {
                const storedConfig = await getFullConfig();
                setConfigState(storedConfig);
            } catch (error) {
                console.error("Failed to load app configuration:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadConfig();
    }, []);

    const setConfig = useCallback((newConfig: AppConfig) => {
        setConfigState(newConfig);
        saveFullConfig(newConfig);
    }, []);

    return (
        <ConfigContext.Provider value={{ config, setConfig, isConfigLoading }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
}
