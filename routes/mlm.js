const fs = require('fs');
const sql = require('mssql');
const { route } = require('./auth');
const router = require('express').Router();





router.get('/',(req,res)=>{
    try {
        const request = req.app.locals.db.request();
        request.input('rootName',sql.Char,"tree");
        const query = `select MemberID, ParentID, LeftChildID, RightChildID from BinaryTreeMLM ; `
        request.query(query,(queryErr,result)=>{
            if(!queryErr) {

                const json = {tree : result.recordset};
                let orgChartJson = {};

                // Find the root node of the tree
                let rootNode = json.tree.find(node => req.query.memberid=="root"?node.MemberID=="1":node.MemberID==req.query.memberid);

                // Create the root node in org chart format
                orgChartJson.id = rootNode.MemberID;

                // Recursively add children to the root node
                addChildrenToNode(orgChartJson, rootNode, json.tree);

                function addChildrenToNode(orgChartNode, treeParentNode, tree) {
                // Find the children of the parent node in the tree
                let children = tree.filter(node => node.ParentID === treeParentNode.MemberID);

                if (children.length > 0) {
                    // Create an empty children array for the org chart node
                    orgChartNode.children = [];

                    // Loop through the children and add them to the org chart node
                    children.forEach(child => {
                    let childNode = { id: child.MemberID };
                    orgChartNode.children.push(childNode);

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





module.exports = router;