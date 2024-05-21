/* tslint:disable */
/* eslint-disable */
/**
 * SpaceTraders API
 * SpaceTraders is an open-universe game and learning platform that offers a set of HTTP endpoints to control a fleet of ships and explore a multiplayer universe.  The API is documented using [OpenAPI](https://github.com/SpaceTradersAPI/api-docs). You can send your first request right here in your browser to check the status of the game server.  ```json http {   \"method\": \"GET\",   \"url\": \"https://api.spacetraders.io/v2\", } ```  Unlike a traditional game, SpaceTraders does not have a first-party client or app to play the game. Instead, you can use the API to build your own client, write a script to automate your ships, or try an app built by the community.  We have a [Discord channel](https://discord.com/invite/jh6zurdWk5) where you can share your projects, ask questions, and get help from other players.   
 *
 * The version of the OpenAPI document: 2.0.0
 * Contact: joel@spacetraders.io
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


// May contain unused imports in some cases
// @ts-ignore
import type { ShipRequirements } from './ship-requirements';

/**
 * The reactor of the ship. The reactor is responsible for powering the ship\'s systems and weapons.
 * @export
 * @interface ShipReactor
 */
export interface ShipReactor {
    /**
     * Symbol of the reactor.
     * @type {string}
     * @memberof ShipReactor
     */
    'symbol': ShipReactorSymbolEnum;
    /**
     * Name of the reactor.
     * @type {string}
     * @memberof ShipReactor
     */
    'name': string;
    /**
     * Description of the reactor.
     * @type {string}
     * @memberof ShipReactor
     */
    'description': string;
    /**
     * The repairable condition of a component. A value of 0 indicates the component needs significant repairs, while a value of 1 indicates the component is in near perfect condition. As the condition of a component is repaired, the overall integrity of the component decreases.
     * @type {number}
     * @memberof ShipReactor
     */
    'condition': number;
    /**
     * The overall integrity of the component, which determines the performance of the component. A value of 0 indicates that the component is almost completely degraded, while a value of 1 indicates that the component is in near perfect condition. The integrity of the component is non-repairable, and represents permanent wear over time.
     * @type {number}
     * @memberof ShipReactor
     */
    'integrity': number;
    /**
     * The amount of power provided by this reactor. The more power a reactor provides to the ship, the lower the cooldown it gets when using a module or mount that taxes the ship\'s power.
     * @type {number}
     * @memberof ShipReactor
     */
    'powerOutput': number;
    /**
     * 
     * @type {ShipRequirements}
     * @memberof ShipReactor
     */
    'requirements': ShipRequirements;
}

export const ShipReactorSymbolEnum = {
    SolarI: 'REACTOR_SOLAR_I',
    FusionI: 'REACTOR_FUSION_I',
    FissionI: 'REACTOR_FISSION_I',
    ChemicalI: 'REACTOR_CHEMICAL_I',
    AntimatterI: 'REACTOR_ANTIMATTER_I'
} as const;

export type ShipReactorSymbolEnum = typeof ShipReactorSymbolEnum[keyof typeof ShipReactorSymbolEnum];


