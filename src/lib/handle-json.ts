import * as JSON_API from "../options.json";

export interface ZenOSJSON {
    maintainers: {
        [key: string]: {
            [key: string]: string
        }
    },
    options: {
        [key: string]: unknown
    },
    pkgs: Record<string, PackageNode>
}

interface PackageNode {
    meta?: PackageMeta;
    sub?: Record<string, PackageNode>;
}

// add ? if it wasn't updated from options.json
export interface PackageMeta {
    description: string;
    homepage: string | null;
    license: string;
    longDescription: string | null;
    maintainers: string[];
    platforms: string[];
    version: string;
    type?: string; // god im so rusty
    default?: string;
}

// should i ditch loading from local and pull it out from github? remember that
// the ratelimit is 60 per hour, maybe we should add cache

export const ZENOS_JSON: ZenOSJSON = JSON_API;