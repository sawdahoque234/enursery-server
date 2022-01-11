const express = require('express')
const { MongoClient } = require('mongodb');
const cors = require('cors')
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId
const fileUpload = require('express-fileupload');
var resizebase64 = require('resize-base64');  

const bodyParser = require('body-parser')
// const stripe = require('stripe')(process.env.STRIPE_SECRET);
const stripe = require('stripe')('sk_test_51JwJJWDWruHMZxwUonpvYSiX7cfzKVTHuhtNCVkHI97L4ghdf7cAU7F8Nk8nmCXLOo3JHnnjYuCPIHpX7kMYbO5d00ugSlbuRI')
const app = express()

app.use(cors());
app.use(express.json())
app.use(fileUpload());
// app.use(express.json({limit: '50mb'}));
// app.use(express.urlencoded({ limit: '50mb' }));


app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
const port = 5000
app.get('/', (req, res) => {
    res.send('Welcome in eNursery Shop !!!!')
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eoyrd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });






async function run() {
    try {
        await client.connect();
        const database = client.db('enursery')
        const productsCollection = database.collection('products')
        const ordersCollection = database.collection('orders')
        const usersCollection = database.collection('users');
        const reviewsCollection = database.collection("reviews");

        
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({})
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count()
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            }
            );
        })
        //get details product
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const product = await productsCollection.findOne(query)
            res.json(product);
        })

        

        //get my orders
        app.get("/orders/:email", async (req, res) => {
            console.log(req.params.email);
            const result = await ordersCollection
              .find({ email: req.params.email })
              .toArray();
            res.send(result);
          });
       
        
        

        app.post("/payment", (req, res) => {
            const { token } = req.body
            return stripe.customers.create({
                email: token.email,
                name:token.name,
                source: token.id
            }).then(customer => {
                stripe.charges.create({

                    // amount: order.price * 100,
                    currency: 'usd',
                    customer: customer.id,
                name:customer.name,

                    receipt_email: token.email,
                    shipping: {
                        name: token.card.name,
                        address: {
                            country:token.card.address_country
                        }
                    }
                },{})
            })
            .then(result=>res.status(200).json(result))
            .catch(err=>console.log(err))
          });
        //post users
        app.post('/users', async (req, res) => {
            const result = await usersCollection.insertOne(req.body);
            console.log(result);
            res.json(result);
        });
        //put admin
        app.put("/makeAdmin", async (req, res) => {
            const filter = { email: req.body.email };
            const result = await usersCollection.find(filter).toArray();
            if (result) {
                const documents = await usersCollection.updateOne(filter, {
                          
                    $set: { role: "admin" },
                });
                console.log(documents)
            }
                    
            res.json(result)
                
        });
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({})
            const reviews = await cursor.toArray();
            res.send(reviews);
        })
         //get allorder
         app.get('/orders', async (req, res) => {
            const cursor = ordersCollection.find({})
            const orders = await cursor.toArray();
            res.send(orders);
        })
// post order
app.post('/orders', async (req, res) => {
    const order = req.body;
    const result = await ordersCollection.insertOne(order)
    console.log('orders', order)
    res.json(result)
    return res.status(200).json({ data: data });
})
        // //post reviews
        app.post('/reviews', async (req, res) => {
            const name = req.body.name;
            const email = req.body.email;
            const description = req.body.description;
            const pic = req.files.image;
            const picData = pic.data;
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const review = {
                name,
                email,
                description,
                image: imageBuffer
            }
            const result = await reviewsCollection.insertOne(review);
            res.json(result);
        })


        


        //post or addproducts
        app.post('/products', async (req, res) => {
            const productName = req.body.productName;
            const sellerName = req.body.sellerName;
            const price = req.body.price;
            const city = req.body.city;
            const stock = req.body.stock;
            const phone = req.body.phone;
            const description = req.body.description;
            const pic = req.files.image;
            const picData = pic.data;
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const product = {
                productName,
                sellerName,
                price,
                stock,
                city,
                phone,
                description,
                image: imageBuffer
            }
            console.log(product)
            const result = await productsCollection.insertOne(product);
            res.json(result)
        })
        //updatestatus
        app.put("/statusUpdate/:id", async (req, res) => {
            const filter = { _id: ObjectId(req.params.id) };
            console.log(req.params.id);
            const result = await ordersCollection.updateOne(filter, {
                $set: {
                    status: req.body.status,
                },
            });
            res.send(result);
            console.log(result);
        });
        //admin check
       
        app.get("/admin/:email", async (req, res) => {
            const result = await usersCollection
                .find({ email: req.params.email })
                .toArray();
            console.log(result);
            res.send(result);
        });


        //delete orders
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query)
            res.json(result)
        })
       
     
    }
        
        
    
    finally {
        // await client.close();
    }
}
run().catch(console.dir);


























//listen
app.listen(port, () => {
    console.log('Server is running',port)
})