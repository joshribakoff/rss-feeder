Make a simple react app to visualize the data from the api, the prod build for the react app should end up in "public" folder, get copies to dist, and should work using vite and vite proxy for local dev. Create separate package.json scripts for dev vs prod, client vs server, serve vs build as needed but keep the naming consistent and logical and clean

 Here is a spec for the react app

the structure of the json from the api returned as you may know is clustered RSS articles from the various feeds, the schemas is as follows: array of clusters, each cluster has an array of articles, each article has a "feed" (inspect the prisma query and schema if needed)

The react app will present a UI with "pills" for the different "clusters" of articles.  Each pill will be labeled with the name of the cluster, and then in parentheses the number of items in the cluster. 

Below the pills will be the list of articles. Each article should link to the article url in a new tab. Each article will also have the content Preview if any.  it will mention which feed it is from and which cluster it is assigned to in small gray text.

Filter logic:

By default, no cluster pills are selected. All articles are shown.
If one or more cluster pills are selected, only articles assigned to those clusters get shown.
