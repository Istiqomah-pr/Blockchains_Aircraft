/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { MyAero } from './my-aero';

@Info({title: 'MyAeroContract', description: 'My Smart Contract' })
export class MyAeroContract extends Contract {

    @Transaction(false)
    @Returns('boolean')
    public async myAeroExists(ctx: Context, myAeroId: string): Promise<boolean> {
        const data: Uint8Array = await ctx.stub.getState(myAeroId);
        return (!!data && data.length > 0);
    }

    @Transaction()
    public async createMyAero(ctx: Context, myAeroId: string,model: string,location: string,year :number,amr_type :string, amr_status:string): Promise<void> {
        const hasAccess = await this.hasRole(ctx, ['Maintenance']);
        if (!hasAccess) {
            throw new Error(`Only Maintenance_team can create Aircraft record`);
        }
        const exists: boolean = await this.myAeroExists(ctx, myAeroId);
        if (exists) {
            throw new Error(`The my aero ${myAeroId} already exists`);
        }
        const myAero: MyAero = new MyAero();
        myAero.model = model;
        myAero.location = location;
        myAero.year = year;
        myAero.amr_type=amr_type;
        myAero.amr_status=amr_status;
        const buffer: Buffer = Buffer.from(JSON.stringify(myAero));
        await ctx.stub.putState(myAeroId, buffer);
       // const eventPayload: Buffer = Buffer.from(`Created Aero Asset ${myAeroId} (${value})`); 
      // ctx.stub.setEvent('myEvent', eventPayload); 
      const transientMap = ctx.stub.getTransient();
      if (transientMap.get('amr_desc')){
          await ctx.stub.putPrivateData ('maintenanceRecord',myAeroId,transientMap.get('amr_desc'));
      }

    }

    @Transaction(false)
    @Returns('MyAero')
    public async readMyAero(ctx: Context, myAeroId: string): Promise<MyAero> {
        const exists: boolean = await this.myAeroExists(ctx, myAeroId);
        if (!exists) {
            throw new Error(`The my aero ${myAeroId} does not exist`);
        }
        const data: Uint8Array = await ctx.stub.getState(myAeroId);
        const myAero: MyAero = JSON.parse(data.toString()) as MyAero;
        try {
            const privBuffer = await ctx.stub.getPrivateData('maintenanceRecord',myAeroId);
            myAero.amr_desc=privBuffer.toString(); 
            return myAero;         
        } catch (error){
            return myAero;
        }
        
    }

    @Transaction()
    public async updateMyAero(ctx: Context, myAeroId: string,model: string,location: string,year :number,amr_type :string, amr_status:string): Promise<void> {
        const hasAccess = await this.hasRole(ctx, ['Maintenance']);
        if (!hasAccess) {
            throw new Error(`Only Maintenance_team  can update Aircraft record`);
        }

        const exists: boolean = await this.myAeroExists(ctx, myAeroId);
        if (!exists) {
            throw new Error(`The my aero ${myAeroId} does not exist`);
        }
        const myAero: MyAero = new MyAero();
        myAero.model = model;
        myAero.location = location;
        myAero.year = year;
        myAero.amr_type=amr_type;
        myAero.amr_status=amr_status;
        const buffer: Buffer = Buffer.from(JSON.stringify(myAero));
        await ctx.stub.putState(myAeroId, buffer);
    }

    @Transaction()
    public async deleteMyAero(ctx: Context, myAeroId: string): Promise<void> {
        const hasAccess = await this.hasRole(ctx, ['Maintenance', 'Operator']);
        if (!hasAccess) {
            throw new Error(`Only Maintenance_team or Operator can delete Aircraft record`);
        }

        const exists: boolean = await this.myAeroExists(ctx, myAeroId);
        if (!exists) {
            throw new Error(`The my aero ${myAeroId} does not exist`);
        }
        await ctx.stub.deleteState(myAeroId);
    }

    @Transaction(false)
    public async queryAllAeros(ctx: Context): Promise<string> {
        const startKey = '000';
        const endKey = '999';
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString());

                const Key = res.value.key;
                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString());
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString();
                }
                allResults.push({ Key, Record });
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }

    @Transaction(false)
    public async queryByType(ctx: Context,type: string): Promise<string> {
        const query = {selector : {type}};
        const queryString =JSON.stringify(query);
        const iterator = await ctx.stub.getQueryResult(queryString);
        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString());

                const Key = res.value.key;
                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString());
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString();
                }
                allResults.push({ Key, Record });
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }
    @Transaction(false)
    public async getHistoryByKey(ctx: Context, myAeroId: string): Promise<string> {
        const iterator = await ctx.stub.getHistoryForKey(myAeroId);
        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString());

                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString());
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString();
                }
                allResults.push({ Record });
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }


    @Transaction(false)
    public async queryMinYear(ctx: Context,min: number, size:number,bookmark:string): Promise<string> {
        const query = {selector : {year:{$gte:min}}};
        const queryString =JSON.stringify(query);
        const {iterator,metadata} = await ctx.stub.getQueryResultWithPagination(queryString,size,bookmark);
        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString());

                const Key = res.value.key;
                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString());
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString();
                }
                allResults.push({ Key, Record });
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }

    public async hasRole(ctx: Context, roles: string[]) {
        const clientID = ctx.clientIdentity;
        for (const roleName of roles) {
            if (clientID.assertAttributeValue('role', roleName)) {
                if (clientID.getMSPID() === 'Org1MSP' && clientID.getAttributeValue('role') === 'Maintenance') { return true; }
                if (clientID.getMSPID() === 'Org2MSP' && clientID.getAttributeValue('role') === 'Operator') { return true; }
            }
        }
        return false;
    }


}
