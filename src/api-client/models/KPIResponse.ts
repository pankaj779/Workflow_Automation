/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DownstreamUsage } from './DownstreamUsage';
export type KPIResponse = {
    id: string;
    name: string;
    status: string;
    frequency: string;
    owner: string;
    lastUpdated: string;
    sqlDefinition: string;
    qualityScore: (number | null);
    linkedAssets: (number | null);
    category: (string | null);
    isFavorite: boolean;
    definition: (string | null);
    businessFormula: (string | null);
    dataSource: (string | null);
    businessUnit: (string | null);
    complexity: (string | null);
    nextUpdate: (string | null);
    downstreamUsage?: Array<DownstreamUsage>;
};

