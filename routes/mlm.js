const fs = require('fs');
const sql = require('mssql');
const { route } = require('./auth');
const router = require('express').Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const isLoggedIn = require('../utility/isLoggedIn');
const IsNumber = require('../utility/checkForNumber');

router.get('/',(req,res)=>{
    if (req.query.memberid !='' && req.query.memberid !='undefined' && req.query.memberid !=undefined) 
    {
        try {
            const request = req.app.locals.db.request();
            request.input('rootName',sql.Char,"tree");
            const query = `select MLM.MemberID, MLM.ParentID, MLM.LeftChildID, MLM.RightChildID, MLM.LeftReferralPoints, MLM.RightReferralPoints, MLM.TotalReferralPoints,PU.user_name,PU.user_type, PU.user_status  from BinaryTreeMLM as MLM join PrimeUsers as PU on MLM.MemberID=PU.user_id;`
            request.query(query,(queryErr,result)=>{
                if(!queryErr ) {
                    const json = {tree : result.recordset};
                    let orgChartJson = {};
    
                    // Find the root node of the tree
                    let rootNode = json.tree.find(node => req.query.memberid=="root"?node.MemberID=="APJ2304000001":node.MemberID==req.query.memberid);
    
                    // Create the root node in org chart format
    
                    orgChartJson = {id: rootNode.MemberID, title:rootNode.MemberID ,newMember : false , parent_id : rootNode.ParentID,name : rootNode.user_name ,left_child_id : rootNode.LeftChildID, right_child_id : rootNode.RightChildID, left_referral_points:rootNode.LeftReferralPoints, right_referral_points:rootNode.RightReferralPoints, total_referral_points:rootNode.TotalReferralPoints, user_type : rootNode.user_type ,user_status : rootNode.user_status,children :[]} ;
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
                            if(child.LeftChildID==null && child.RightChildID==null && child.user_status) {
                                childNode['children'].push({name:'L', title : "New Member" , parentID : child.MemberID, newMember : true});
                                childNode['children'].push({name:'R',title : "New Member" ,parentID:child.MemberID,newMember : true});
                            } else if ((child.LeftChildID==null || child.RightChildID==null) && child.user_status) {
                                const position = child.LeftChildID?'R' :'L';
                                childNode['children'].push({name:position,title : "New Member",status:"new",parentID:child.MemberID,newMember : true});   
                            }
                            orgChartNode['children'].push(childNode);
                        // Recursively add children to the child node
                        addChildrenToNode(childNode, child, tree);
                        });
                    }
                    }
                    res.json({ res:true,chart : orgChartJson});
                } else {
                    res.json({res:true});
                    console.log(queryErr);
                }
            });
        } catch(error) {
            console.error(error);
        } 

    }
    
});

router.get('/points/value',(req,res)=>{
    req.app.locals.db.query('select point_value from points_table;',(queryErr,result)=>{
        if(!queryErr) {
            res.json({res:true, points : result.recordset[0].point_value})
        } else {
            res.json({res:false});
        }
    });
});

router.post('/add',(req,res)=>{
    function updateReferralPoints(memberID, parentID) {
        // Update the referral points for the parent
        const request = req.app.locals.db.request();
        request.input('member_id',sql.NVarChar, memberID);
        request.input('parent_id',sql.NVarChar, parentID);
        const query = ```SET NOCOUNT ON;
        DECLARE @NewMemberID NVARCHAR(50) = @member_id;
        DECLARE @NewMemberParentID NVARCHAR(50) = @parent_id;
        DECLARE @AncestorID NVARCHAR(50) = @NewMemberParentID;
        DECLARE @TempMemberID NVARCHAR(50) = @NewMemberID;
        DECLARE @ReferralPoints INT = (select p.plan_points from PrimePackagePlan as p join PrimeUsers as users on p.plan_id=users.prime_plan_id where users.user_id=@NewMemberID);
        UPDATE MLM
        SET MLM.HasAnyChildReferred=CASE WHEN MLM.LeftChildID=@NewMemberParentID OR MLM.RightChildID=@NewMemberParentID THEN 1 ELSE MLM.HasAnyChildReferred END
        FROM BinaryTreeMLM AS MLM 
        JOIN PrimeUsers as PU ON MLM.MemberID=PU.user_id
        WHERE MLM.MemberID=(Select ParentID FROM BinaryTreeMLM WHERE MemberID = @NewMemberParentID);
        -- Update Referral points for all users
        WHILE @AncestorID is not NULL
        BEGIN 
            UPDATE BinaryTreeMLM
            SET 
            LeftReferralPoints = CASE WHEN LeftChildID=@TempMemberID THEN LeftReferralPoints+@ReferralPoints ELSE LeftReferralPoints END,
            RightReferralPoints = CASE WHEN RightChildID=@TempMemberID  THEN RightReferralPoints+@ReferralPoints ELSE RightReferralPoints END,
            TotalReferralPoints = CASE WHEN LeftChildID=@TempMemberID or RightChildID=@TempMemberID  THEN TotalReferralPoints+@ReferralPoints ELSE TotalReferralPoints END
            WHERE MemberID=@AncestorID;
            SET @TempMemberID = @AncestorID;
            SET @AncestorID=(Select ParentID from BinaryTreeMLM where MemberID=@AncestorID);
        END```;
        request.query(query);
    }
    bcrypt.hash(req.body.password, 10, (err,hash)=>{ 
        if(err) {
            console.log(err);
            res.json({res:false});
        } else {
            const now = new Date();
            const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
            const currentYear = now.getFullYear().toString().slice(-2);
            const currentDate = (now.getDate).toString();
            const request = req.app.locals.db.request();
            request.input('name',sql.NVarChar,req.body.user_name);
            request.input('password',sql.NVarChar,hash);
            request.input('year',sql.NChar,currentYear);
            request.input('month',sql.NChar,currentMonth);
            request.input('date',sql.NChar,currentDate);
            request.input('type',sql.VarChar,req.body.user_type);
            request.input('parentID',sql.NVarChar,req.body.parentID);
            request.input('position',sql.NChar,req.body.position);
            request.input('plan_id',sql.NVarChar,req.body.plan_id);
            request.input('is_active',sql.Bit,0);
            request.input('sponsor_id',sql.VarChar,req.body.sponsor_id);
            const insertQuery = `
            DECLARE @flag bit ;
            SET @flag = 0;
            IF @position='L' and (Select LeftChildID from BinaryTreeMLM where MemberID=@parentID) is not null 
            BEGIN 
            SET @flag=1; 
            END 
            IF @position='R' and (select RightChildID from BinaryTreeMLM where MemberID=@parentID) is not null 
            BEGIN 
            SET @flag = 1; 
            END  
            IF @flag=0 
            BEGIN 
            Insert into PrimeUsers(user_name,user_parent_id,registered_month,registered_year,registered_date,user_type,user_password,user_position,user_status,user_sponsor_id,prime_plan_id) 
            values (@name,@parentID,@month,@year,@date,@type,@password,@position,@is_active,@sponsor_id,@plan_id);
            END
            
            `
            
            request.query(insertQuery,(queryErr,result)=>{
                if(!queryErr) {
                    
                    res.json({res:true, action : true});
                } else {
                    console.log(queryErr);
                    res.json({res:true, action : false});
                }
            });  
        }
    });
    
})

router.get('/update',(req,res)=>{
     function insertUsersToDB(parentID,position,count) {
        console.log(count);
        if(count>=8) {
            
            return;
        }
        if(count <= 7) {
            const request = req.app.locals.db.request();
            const now = new Date();
            const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
            const currentYear = now.getFullYear().toString().slice(-2);
            const currentDate = (now.getDate).toString();   
        request.input('name',sql.NVarChar,'admin');
        request.input('password',sql.NVarChar,'$2b$10$My1HbZzlD2woZHvNMckDC.7L29hvrJ7C1rcuD4KLBrwsICe8cW/bG');
        request.input('year',sql.NChar,currentYear);
        request.input('month',sql.NChar,currentMonth);
        request.input('type',sql.VarChar,'ADMIN');
        request.input('parentID',sql.NVarChar,parentID);
        request.input('position',sql.NChar,position);
        request.input('plan_id',sql.NVarChar,'PLAN001');
        request.query("DECLARE @outputTable TABLE (UserID NVARCHAR(50));Insert into PrimeUsers(user_name,user_parent_id,registered_month,registered_year,user_type,user_password,user_position,prime_plan_id) OUTPUT Inserted.user_id INTO @outputtable values (@name,@parentID,@month,@year,@type,@password,@position,@plan_id);Select UserID from @outputtable;",(queryErr,result)=>{
            console.log(result.recordset[0]);
            if (queryErr) {
                console.log(queryErr);
            }
            insertUsersToDB(result.recordset[0].UserID,'L',count+1);
            insertUsersToDB(result.recordset[0].UserID,'R',count+1);
            
        });  
        } 
        
        
    } 
    insertUsersToDB(null,null,1);
})


router.get('/wallet',(req,res,next)=>{
    if(req.isAuthenticated() && req.user.type =='prime')
        next()
    else 
        res.sendStatus(403);
},(req,res)=>{
    const request = req.app.locals.db.request();
    request.input('user_id', sq.NChar,req.user.id);
    request.query("Select * from PrimeUsersWallet where prime_user_id=@user_id",(queryErr,result)=>{
        if(!queryErr) {
            res.json({res:true, wallet_balance : result.recordset[0].wallet_balance, discount_coupon : result.recordset[0].discount_coupon});
        } else {
            res.json({res:false});
        }
    });
});

router.get('/dairy',isLoggedIn, async (req,res)=>{
    try {
        const request = req.app.locals.db.request();
        request.input('id',sql.NVarChar, req.user.id);
        const getDairyQuery = 'Select * from MLMDairy where member_sponsor_id=@id';
        const result = await request.query(getDairyQuery);
        res.json({res:true, members : result.recordset});
    
    } catch (err) {
        console.log(err);
        res.json({res:false, error_msg : err.message});
    }
});

router.post('/dairy/:type',isLoggedIn, async (req,res)=>{
    const type = req.params.type;
    if (type == 'new') {
        try {
            if (!IsNumber(req.body?.member_details?.member_phone)) {
                throw new Error('Invalid Mobile Number');
            }
            const request = req.app.locals.db.request();
            request.input('name', sql.NVarChar, req.body.member_details.member_name);
            request.input('email', sql.NVarChar, req.body.member_details.member_email);
            request.input('phone', sql.Char, req.body.member_details.member_phone);
            request.input('id', sql.NVarChar, req.user.id);

            const insertQuery = 'Insert into MLMDairy(member_name,member_email,member_phone,member_sponsor_id) values(@name,@email,@phone,@id)';
            const result = await request.query(insertQuery);
            res.json({res : true, action : true});
            
        } catch (err) {
            console.log(err);
            res.json({res:false, error_msg : err.message});
        }
    } else if (type=='update') {
        try {
            const request = req.app.locals.db.request();
            request.input('id', sql.NVarChar, req.body.member_id);
            request.input('status', sql.NVarChar, req.body.status);
            const updateQuery = 'Update MLMDairy set status=@status where member_id=@id';
            const result = await request.query(updateQuery);
            if (result.rowsAffected[0] ==0) 
                throw new Error('Member Not Found');
            res.json({res:true, action : true});    
        } catch (err) {
            console.log(err);
            res.json({res:false, error_msg : err.message});
        }
    } else {
        res.json({res:false, error_msg : 'Invalid Parameters. Check your request URL'});
    }
});

module.exports = router;