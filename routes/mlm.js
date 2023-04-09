const fs = require('fs');
const sql = require('mssql');
const { route } = require('./auth');
const router = require('express').Router();
const bodyParser = require('body-parser');

router.use(bodyParser.urlencoded(true));
router.get('/',(req,res)=>{
    try {
        const request = req.app.locals.db.request();
        request.input('rootName',sql.Char,"tree");
        const query = `select MLM.MemberID, MLM.ParentID, MLM.LeftChildID, MLM.RightChildID, MLM.LeftReferralPoints, MLM.RightReferralPoints, MLM.TotalReferralPoints,PU.user_name,PU.user_type, PU.user_status  from BinaryTreeMLM as MLM join PrimeUsers as PU on MLM.MemberID=PU.user_id;`
        request.query(query,(queryErr,result)=>{
            if(!queryErr) {
                const json = {tree : result.recordset};
                let orgChartJson = {};

                // Find the root node of the tree
                let rootNode = json.tree.find(node => req.query.memberid=="root"?node.MemberID=="OTP2304000001":node.MemberID==req.query.memberid);

                // Create the root node in org chart format

                orgChartJson = {id: rootNode.MemberID, title:rootNode.MemberID ,newMember : false , parent_id : rootNode.ParentID,name : rootNode.user_name ,left_child_id : rootNode.LeftChildID, right_child_id : rootNode.RightChildID, left_referral_points:rootNode.LeftReferralPoints, right_referral_points:rootNode.RightReferralPoints, total_referral_points:rootNode.TotalReferralPoints, user_type : rootNode.user_type,user_status:rootNode.user_status ,children :[]} ;
                orgChartJson.children = [];
                // Recursively add children to the root node
                addChildrenToNode(orgChartJson, rootNode, json.tree);

                function addChildrenToNode(orgChartNode, treeParentNode, tree) {
                // Find the children of the parent node in the tree
                let children = tree.filter(node => node.ParentID === treeParentNode.MemberID);

                if (children.length > 0) {
                    // Create an empty children array for the org chart node
                    
                   
                    // Loop through the children and add them to the org chart node
                    children.forEach(child => {

                    let   childNode = { id: child.MemberID, title:child.MemberID ,newMember : false , parent_id : child.ParentID,name : child.user_name ,left_child_id : child.LeftChildID, right_child_id : child.RightChildID, left_referral_points:child.LeftReferralPoints, right_referral_points:child.RightReferralPoints, total_referral_points:child.TotalReferralPoints, user_type : child.user_type, user_status : child.user_status ,children :[]  };
                        if(child.LeftChildID==null && child.RightChildID==null ) {
                            childNode['children'].push({name:'L', title : "New Member" , parentID : child.MemberID, newMember : true});
                            childNode['children'].push({name:'R',title : "New Member" ,parentID:child.MemberID,newMember : true});
                        } else if ((child.LeftChildID==null || child.RightChildID==null)) {
                            const position = child.LeftChildID?'R' :'L';
                            childNode['children'].push({name:position,title : "New Member",status:"new",parentID:child.MemberID,newMember : true});   
                        }
                        orgChartNode['children'].push(childNode);
                    // Recursively add children to the child node
                    addChildrenToNode(childNode, child, tree);
                    });
                }
                }
                res.json({chart : orgChartJson});
            } else {
                console.log(queryErr);
            }
        });
    } catch(error) {
        console.error(error);
    } 
});

router.post('/add',(req,res)=>{
    // function insertUsersToDB(parentID,position,flag1,flag2,count) {
    //     console.log(count);
    //     if(count>=8) {
            
    //         return;
    //     }
    //     if(count <= 7) {
    //         const request = req.app.locals.db.request();
    //     request.input('name',sql.NVarChar,'admin');
    //     request.input('password',sql.NVarChar,'Test@123');
    //     request.input('year',sql.NChar,'23');
    //     request.input('month',sql.NChar,'04');
    //     request.input('type',sql.VarChar,'ADMIN');
    //     request.input('parentID',sql.NVarChar,parentID);
    //     request.input('position',sql.NChar,position);
    //     request.query("DECLARE @outputTable TABLE (UserID NVARCHAR(50));Insert into PrimeUsers(user_name,user_parent_id,registered_month,registered_year,user_type,user_password,user_position) OUTPUT Inserted.user_id INTO @outputtable values (@name,@parentID,@month,@year,@type,@password,@position);Select UserID from @outputtable;",(queryErr,result)=>{
    //         console.log(result.recordset[0]);
    //         insertUsersToDB(result.recordset[0].UserID,'L',false,true,count+1);
    //         insertUsersToDB(result.recordset[0].UserID,'R',true,false,count+1);
            
    //     });  
    //     } 
        
        
    // } 
    // insertUsersToDB(null,null,true,true,1);
    
    // for(let i=1;i<64;i++){

    // }
    const request = req.app.locals.db.request();
    request.input('name',sql.NVarChar,req.body.user_name);
        request.input('password',sql.NVarChar,'Test@123');
        request.input('year',sql.NChar,'23');
        request.input('month',sql.NChar,'04');
        request.input('type',sql.VarChar,req.body.user_type);
        request.input('parentID',sql.NVarChar,req.body.parentID);
        request.input('position',sql.NChar,req.body.position);
        request.query(" Insert into PrimeUsers(user_name,user_parent_id,registered_month,registered_year,user_type,user_password,user_position) values (@name,@parentID,@month,@year,@type,@password,@position);",(queryErr,result)=>{
            if(!queryErr) {
                res.json({res:true});
            } else {
                console.log(queryErr);
                res.json({res:false});
            }
        });  
})




module.exports = router;